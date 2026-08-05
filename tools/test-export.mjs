// Mock LeetCode in Node and run the real exporter against it.
import fs from 'node:fs';

const SCRIPT = new URL('./export-leetcode.js', import.meta.url).pathname;

// ---- fake account -------------------------------------------------------
// p1: two accepted Java submissions -> must keep the NEWER one (id 1002)
// p9: accepted Java, plus a newer WRONG ANSWER -> must keep the accepted one
// p20: accepted but Python only -> must be EXCLUDED
// p35: accepted Java, but ONLY reachable via recovery pass (not in feed)
// p53: accepted Kotlin -> must be EXCLUDED (JVM but not Java)
const feed = [
  { id: 1002, title: 'Two Sum', title_slug: 'two-sum', status_display: 'Accepted', lang: 'java', timestamp: 200, code: 'NEWER two-sum' },
  { id: 1001, title: 'Two Sum', title_slug: 'two-sum', status_display: 'Accepted', lang: 'java', timestamp: 100, code: 'OLDER two-sum' },
  { id: 1010, title: 'Palindrome Number', title_slug: 'palindrome-number', status_display: 'Wrong Answer', lang: 'java', timestamp: 300, code: 'BAD' },
  { id: 1009, title: 'Palindrome Number', title_slug: 'palindrome-number', status_display: 'Accepted', lang: 'java', timestamp: 250, code: 'GOOD palindrome' },
  { id: 1020, title: 'Valid Parentheses', title_slug: 'valid-parentheses', status_display: 'Accepted', lang: 'python3', timestamp: 400, code: 'python code' },
  { id: 1053, title: 'Maximum Subarray', title_slug: 'maximum-subarray', status_display: 'Accepted', lang: 'kotlin', timestamp: 500, code: 'kotlin code' },
];

const solvedAll = [
  { questionFrontendId: '1', title: 'Two Sum', titleSlug: 'two-sum', difficulty: 'Easy' },
  { questionFrontendId: '9', title: 'Palindrome Number', titleSlug: 'palindrome-number', difficulty: 'Easy' },
  { questionFrontendId: '20', title: 'Valid Parentheses', titleSlug: 'valid-parentheses', difficulty: 'Easy' },
  { questionFrontendId: '35', title: 'Search Insert Position', titleSlug: 'search-insert-position', difficulty: 'Easy' },
  { questionFrontendId: '53', title: 'Maximum Subarray', titleSlug: 'maximum-subarray', difficulty: 'Medium' },
];

const meta = {
  'two-sum': { questionFrontendId: '1', title: 'Two Sum', titleSlug: 'two-sum', difficulty: 'Easy', topicTags: [{ name: 'Array' }, { name: 'Hash Table' }] },
  'palindrome-number': { questionFrontendId: '9', title: 'Palindrome Number', titleSlug: 'palindrome-number', difficulty: 'Easy', topicTags: [{ name: 'Math' }] },
  'search-insert-position': { questionFrontendId: '35', title: 'Search Insert Position', titleSlug: 'search-insert-position', difficulty: 'Easy', topicTags: [{ name: 'Array' }, { name: 'Binary Search' }] },
};

const PAGE = 20;
let downloaded = null;

globalThis.fetch = async (url, opts = {}) => {
  if (String(url).startsWith('/api/submissions/')) {
    const offset = Number(new URL(url, 'http://x').searchParams.get('offset')) || 0;
    const slice = feed.slice(offset, offset + PAGE);
    return { ok: true, status: 200, json: async () => ({ submissions_dump: slice, has_next: offset + PAGE < feed.length }) };
  }
  sawCsrf.push(opts.headers?.['x-csrftoken']);
  const body = JSON.parse(opts.body);
  const op = body.operationName, v = body.variables;
  const data = {};
  if (op === 'globalData') data.userStatus = { isSignedIn: true, username: 'ashwin1122' };
  else if (op === 'problemsetQuestionList') data.problemsetQuestionList = { total: solvedAll.length, questions: v.skip === 0 ? solvedAll : [] };
  else if (op === 'submissionList') {
    data.questionSubmissionList = { submissions: v.questionSlug === 'search-insert-position'
      ? [{ id: 1035, statusDisplay: 'Accepted', lang: 'java', timestamp: 600, runtimeDisplay: '0 ms', memoryDisplay: '40 MB' }]
      : [] };
  } else if (op === 'submissionDetails') data.submissionDetails = { code: 'RECOVERED search-insert', lang: { name: 'java' } };
  else if (op === 'questionData') data.question = meta[v.titleSlug] || null;
  return { ok: true, status: 200, json: async () => ({ data }) };
};

globalThis.window = globalThis;
globalThis.Blob = class { constructor(parts) { downloaded = parts.join(''); } };
globalThis.URL.createObjectURL = () => 'blob:mock';
globalThis.URL.revokeObjectURL = () => {};
let sawCsrf = [];
globalThis.document = {
  cookie: 'csrftoken=FAKE-CSRF-TOKEN; LEETCODE_SESSION=abc',
  createElement: () => ({ click() {}, remove() {}, set href(_) {}, set download(_) {} }),
  body: { appendChild() {} },
};

const src = fs.readFileSync(SCRIPT, 'utf8');
eval(src);
for (let i = 0; i < 600 && downloaded === null; i++) await new Promise((r) => setTimeout(r, 100));
if (downloaded === null) { console.error('TIMEOUT: exporter never produced a download'); process.exit(1); }

// ---- assertions ---------------------------------------------------------
const out = JSON.parse(downloaded);
const bySlug = Object.fromEntries(out.problems.map((p) => [p.titleSlug, p]));
let fails = 0;
const check = (name, cond) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name); if (!cond) fails++; };

console.log('\n--- assertions ---');
check('keeps latest accepted Java (two-sum = NEWER)', bySlug['two-sum']?.code === 'NEWER two-sum');
check('ignores newer non-accepted (palindrome = GOOD)', bySlug['palindrome-number']?.code === 'GOOD palindrome');
check('excludes non-Java (python valid-parentheses absent)', !bySlug['valid-parentheses']);
check('excludes Kotlin (maximum-subarray absent)', !bySlug['maximum-subarray']);
check('recovery pass finds feed-missing problem', bySlug['search-insert-position']?.code === 'RECOVERED search-insert');
check('recovery entry marked as such', bySlug['search-insert-position']?.source === 'graphql_recovery');
check('no duplicate entries', out.problems.length === new Set(out.problems.map((p) => p.titleSlug)).size);
check('exactly 3 problems exported', out.problems.length === 3);
check('sorted by problem number', out.problems.map((p) => Number(p.questionId)).join() === '1,9,35');
check('topic tags attached', bySlug['two-sum']?.topicTags?.join() === 'Array,Hash Table');
check('difficulty counts correct', out.difficultyCounts.Easy === 3 && out.difficultyCounts.Medium === 0);
check('solvedAllLanguages reported', out.solvedAllLanguages === 5);
check('sends x-csrftoken on every GraphQL call',
  sawCsrf.length > 0 && sawCsrf.every((t) => t === 'FAKE-CSRF-TOKEN'));
check('unaccountedFor lists solved-but-not-Java problems',
  out.unaccountedFor?.map((u) => u.titleSlug).sort().join() === 'maximum-subarray,valid-parentheses');
check('unaccountedFor entries carry a reason',
  out.unaccountedFor?.every((u) => typeof u.reason === 'string' && u.reason));
check('problem url built', bySlug['two-sum']?.url === 'https://leetcode.com/problems/two-sum/');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nall assertions passed');
fs.writeFileSync(new URL('./mock-export.json', import.meta.url).pathname, downloaded);
process.exit(fails ? 1 : 0);
