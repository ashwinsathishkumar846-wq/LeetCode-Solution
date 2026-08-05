/*
 * LeetCode accepted-Java-submission exporter
 * ------------------------------------------
 * HOW TO RUN
 *   1. Open https://leetcode.com in your browser and make sure you are LOGGED IN.
 *   2. Open DevTools (F12 / Cmd+Opt+I) -> Console tab.
 *   3. Firefox/Safari only: type `allow pasting` and press Enter first.
 *      Chrome may also ask you to type `allow pasting` the first time.
 *   4. Paste this entire file and press Enter.
 *   5. Wait. Progress is printed as it goes (it is deliberately slow to stay
 *      well under LeetCode's rate limits). Expect a couple of minutes.
 *   6. A file named `leetcode-java-submissions.json` downloads automatically.
 *
 * WHAT IT DOES
 *   Pass 1  Walks /api/submissions/ (your full submission history, newest first)
 *           and keeps the FIRST accepted Java submission seen per problem --
 *           because the feed is newest-first, that is your LATEST accepted
 *           Java submission for that problem. One entry per problem, no dupes.
 *   Pass 2  Asks GraphQL for the list of every problem you have solved, diffs it
 *           against pass 1, and recovers anything missing by querying that
 *           problem's submission list directly. (The /api/submissions/ feed can
 *           truncate very old history; this pass closes that gap.)
 *   Pass 3  Enriches each entry with problem number, difficulty and topic tags.
 *
 * It only READS. It never submits, edits or deletes anything on your account.
 * Your source code is not sent anywhere -- it goes straight to a local download.
 */

(async () => {
  'use strict';

  const SLEEP_MS = 350;           // politeness delay between network calls
  const PAGE = 20;                // /api/submissions/ page size
  const MAX_PAGES = 400;          // hard stop so a bad response can't loop forever
  const OUT_FILE = 'leetcode-java-submissions.json';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log('%c[leetcode-export]', 'color:#f89f1b;font-weight:bold', ...a);
  const warn = (...a) => console.warn('[leetcode-export]', ...a);

  // A submission counts as Java for our purposes if LeetCode labels it java.
  // (Kotlin/Scala run on the JVM but are separate languages -- excluded.)
  const isJava = (lang) => String(lang || '').toLowerCase() === 'java';

  async function gql(query, variables, operationName) {
    const res = await fetch('/graphql/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables, operationName }),
    });
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 300)}`);
    return json.data;
  }

  // ---- sanity check: are we actually logged in? -----------------------------
  let username = null;
  try {
    const me = await gql(
      `query globalData { userStatus { isSignedIn username } }`, {}, 'globalData');
    if (!me?.userStatus?.isSignedIn) throw new Error('not signed in');
    username = me.userStatus.username;
    log(`signed in as ${username}`);
  } catch (e) {
    console.error(
      '%cNot signed in to LeetCode (or GraphQL blocked). Log in at leetcode.com and re-run this script.',
      'color:#e74c3c;font-weight:bold');
    return;
  }

  // ---- pass 1: walk the submission history feed -----------------------------
  const bySlug = new Map();   // titleSlug -> entry (first seen == latest accepted)
  let scanned = 0;

  log('pass 1/3: scanning submission history...');
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE;
    let data;
    try {
      const res = await fetch(`/api/submissions/?offset=${offset}&limit=${PAGE}`,
        { credentials: 'include' });
      if (res.status === 429) { warn('rate limited, backing off 5s'); await sleep(5000); page--; continue; }
      if (!res.ok) { warn(`submissions feed HTTP ${res.status}; stopping pass 1`); break; }
      data = await res.json();
    } catch (e) {
      warn('submissions feed failed:', e.message, '- stopping pass 1');
      break;
    }

    const dump = data?.submissions_dump || [];
    for (const s of dump) {
      scanned++;
      if (s.status_display !== 'Accepted') continue;
      if (!isJava(s.lang)) continue;
      if (bySlug.has(s.title_slug)) continue;      // already have a NEWER one
      bySlug.set(s.title_slug, {
        title: s.title,
        titleSlug: s.title_slug,
        submissionId: String(s.id),
        lang: s.lang,
        timestamp: Number(s.timestamp) || null,
        runtime: s.runtime || null,
        memory: s.memory || null,
        code: s.code,
        source: 'submissions_dump',
      });
    }

    if (dump.length) log(`  page ${page + 1}: ${scanned} submissions scanned, ${bySlug.size} java problems found`);
    if (!data?.has_next) break;
    await sleep(SLEEP_MS);
  }
  log(`pass 1 done: ${bySlug.size} problems with an accepted Java submission`);

  // ---- pass 2: diff against your solved list, recover anything missing ------
  log('pass 2/3: cross-checking against your solved-problems list...');
  const solved = [];
  try {
    for (let skip = 0; skip < 5000; skip += 100) {
      const d = await gql(
        `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
           problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
             total: totalNum
             questions: data { questionFrontendId title titleSlug difficulty status }
           }
         }`,
        { categorySlug: '', limit: 100, skip, filters: { status: 'AC' } },
        'problemsetQuestionList');
      const qs = d?.problemsetQuestionList?.questions || [];
      solved.push(...qs);
      if (qs.length < 100) break;
      await sleep(SLEEP_MS);
    }
    log(`  you have solved ${solved.length} problems in total (all languages)`);
  } catch (e) {
    warn('could not fetch solved list:', e.message, '- skipping recovery pass');
  }

  const missing = solved.filter((q) => !bySlug.has(q.titleSlug));
  if (missing.length) {
    log(`  ${missing.length} solved problems not covered by pass 1; checking each for a Java submission...`);
    for (const q of missing) {
      try {
        const d = await gql(
          `query submissionList($offset: Int!, $limit: Int!, $questionSlug: String!) {
             questionSubmissionList(offset: $offset, limit: $limit, questionSlug: $questionSlug) {
               submissions { id statusDisplay lang timestamp runtimeDisplay memoryDisplay }
             }
           }`,
          { offset: 0, limit: 20, questionSlug: q.titleSlug },
          'submissionList');
        const subs = d?.questionSubmissionList?.submissions || [];
        const hit = subs.find((s) => s.statusDisplay === 'Accepted' && isJava(s.lang));
        if (!hit) { await sleep(SLEEP_MS); continue; }

        const det = await gql(
          `query submissionDetails($submissionId: Int!) {
             submissionDetails(submissionId: $submissionId) { code lang { name } }
           }`,
          { submissionId: Number(hit.id) },
          'submissionDetails');
        const code = det?.submissionDetails?.code;
        if (!code) { warn(`  no code returned for ${q.titleSlug}`); await sleep(SLEEP_MS); continue; }

        bySlug.set(q.titleSlug, {
          title: q.title,
          titleSlug: q.titleSlug,
          submissionId: String(hit.id),
          lang: 'java',
          timestamp: Number(hit.timestamp) || null,
          runtime: hit.runtimeDisplay || null,
          memory: hit.memoryDisplay || null,
          code,
          source: 'graphql_recovery',
        });
        log(`  recovered ${q.titleSlug}`);
      } catch (e) {
        warn(`  recovery failed for ${q.titleSlug}: ${e.message}`);
      }
      await sleep(SLEEP_MS);
    }
  } else if (solved.length) {
    log('  nothing missing');
  }

  if (!bySlug.size) {
    console.error('%cNo accepted Java submissions found. Nothing exported.',
      'color:#e74c3c;font-weight:bold');
    return;
  }

  // ---- pass 3: enrich with problem number, difficulty, topic tags -----------
  log(`pass 3/3: fetching metadata for ${bySlug.size} problems...`);
  const solvedBySlug = new Map(solved.map((q) => [q.titleSlug, q]));
  let done = 0;
  for (const [slug, entry] of bySlug) {
    try {
      const d = await gql(
        `query questionData($titleSlug: String!) {
           question(titleSlug: $titleSlug) {
             questionFrontendId
             title
             titleSlug
             difficulty
             topicTags { name slug }
           }
         }`,
        { titleSlug: slug },
        'questionData');
      const q = d?.question;
      if (q) {
        entry.questionId = q.questionFrontendId || null;
        entry.title = q.title || entry.title;
        entry.difficulty = q.difficulty || null;
        entry.topicTags = (q.topicTags || []).map((t) => t.name);
      }
    } catch (e) {
      warn(`  metadata failed for ${slug}: ${e.message}`);
    }
    // fall back to whatever the solved list told us
    if (!entry.questionId && solvedBySlug.has(slug)) {
      entry.questionId = solvedBySlug.get(slug).questionFrontendId || null;
      entry.difficulty = entry.difficulty || solvedBySlug.get(slug).difficulty || null;
    }
    entry.topicTags = entry.topicTags || [];
    entry.url = `https://leetcode.com/problems/${slug}/`;

    done++;
    if (done % 5 === 0 || done === bySlug.size) log(`  ${done}/${bySlug.size}`);
    await sleep(SLEEP_MS);
  }

  // ---- assemble + download --------------------------------------------------
  const entries = [...bySlug.values()].sort(
    (a, b) => (Number(a.questionId) || 1e9) - (Number(b.questionId) || 1e9));

  const counts = { Easy: 0, Medium: 0, Hard: 0 };
  for (const e of entries) if (counts[e.difficulty] !== undefined) counts[e.difficulty]++;

  const payload = {
    exportedAt: new Date().toISOString(),
    username,
    language: 'java',
    totalProblems: entries.length,
    difficultyCounts: counts,
    solvedAllLanguages: solved.length || null,
    problems: entries,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = OUT_FILE;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);

  const noCode = entries.filter((e) => !e.code).length;
  const noId = entries.filter((e) => !e.questionId).length;

  console.log('%c[leetcode-export] DONE', 'color:#2ecc71;font-weight:bold;font-size:14px');
  log(`exported ${entries.length} problems -> ${OUT_FILE} (check your Downloads folder)`);
  log(`   Easy ${counts.Easy} | Medium ${counts.Medium} | Hard ${counts.Hard}`);
  if (solved.length) log(`   (LeetCode says you have solved ${solved.length} problems across all languages)`);
  if (noCode) warn(`   ${noCode} entries have NO source code -- tell Claude, do not hand-fill them`);
  if (noId) warn(`   ${noId} entries have NO problem number -- tell Claude`);
  window.__leetcodeExport = payload;   // also left here in case the download is blocked
  log('payload also available as window.__leetcodeExport');
})();
