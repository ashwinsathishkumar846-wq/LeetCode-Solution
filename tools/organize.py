#!/usr/bin/env python3
"""
Turn the DevTools export into an organised solutions repository.

    python3 tools/organize.py leetcode-java-submissions.json

Reads the JSON produced by tools/export-leetcode.js, writes one .java file per
problem into a topic folder, and regenerates README.md.

Source code is written out BYTE-FOR-BYTE as exported. This script never edits,
reformats, reindents or generates a solution.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

# --------------------------------------------------------------------------
# Topic routing.
#
# A LeetCode problem carries several topic tags ("Two Sum" is tagged Array,
# Hash Table). Each solution lives in exactly one folder, so we walk this list
# top-to-bottom and take the first tag the problem has. Specific data
# structures and techniques therefore win over the broad Array/String/Math
# catch-alls. Every tag is still listed in the README table.
#
# Reorder these rows to change where problems land, then re-run the script.
# --------------------------------------------------------------------------
TOPIC_PRIORITY: list[tuple[str, tuple[str, ...]]] = [
    ("Database",             ("Database",)),
    ("Design",               ("Design",)),
    ("Graphs",               ("Graph", "Graph Theory", "Union Find", "Topological Sort",
                              "Shortest Path")),
    ("Trees",                ("Binary Search Tree", "Binary Tree", "Tree")),
    ("Linked List",          ("Linked List",)),
    ("Heap (Priority Queue)",("Heap (Priority Queue)",)),
    ("Stack",                ("Stack", "Monotonic Stack")),
    ("Queue",                ("Queue", "Monotonic Queue")),
    # scanning techniques before DP: LeetCode tags several two-pointer problems
    # (e.g. Is Subsequence) with Dynamic Programming for an alternative solution
    ("Sliding Window",       ("Sliding Window",)),
    ("Two Pointers",         ("Two Pointers",)),
    ("Binary Search",        ("Binary Search",)),
    ("Dynamic Programming",  ("Dynamic Programming",)),
    ("Backtracking",         ("Backtracking",)),
    ("Bit Manipulation",     ("Bit Manipulation",)),
    ("Matrix",               ("Matrix",)),
    ("Prefix Sum",           ("Prefix Sum",)),
    ("Graph Traversal",      ("Depth-First Search", "Breadth-First Search")),
    ("Greedy",               ("Greedy",)),
    ("Hash Table",           ("Hash Table",)),
    ("Strings",              ("String", "String Matching")),
    ("Arrays",               ("Array",)),
    # broad techniques last -- they tag a lot of problems that belong elsewhere.
    # Trie sits here rather than near the top because LeetCode tags string
    # problems like Longest Common Prefix with it for an alternative solution.
    ("Trie",                 ("Trie",)),
    ("Sorting",              ("Sorting",)),
    ("Math",                 ("Math", "Number Theory", "Geometry", "Counting", "Recursion",
                              "Simulation", "Enumeration")),
]

FALLBACK_TOPIC = "Miscellaneous"
DIFFICULTY_ORDER = ("Easy", "Medium", "Hard")
DIFFICULTY_BADGE = {
    "Easy": "🟢 Easy",
    "Medium": "🟡 Medium",
    "Hard": "🔴 Hard",
}

INVALID_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def pick_topic(tags: list[str]) -> str:
    tagset = {t.strip() for t in tags or []}
    for folder, members in TOPIC_PRIORITY:
        if tagset & set(members):
            return folder
    return FALLBACK_TOPIC


def safe_filename(title: str) -> str:
    cleaned = INVALID_FILENAME_CHARS.sub("-", title).strip().rstrip(".")
    return re.sub(r"\s+", " ", cleaned)


def load(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        sys.exit(f"error: {path} not found")
    except json.JSONDecodeError as exc:
        sys.exit(f"error: {path} is not valid JSON ({exc})")

    if isinstance(payload, list):          # bare array of problems is fine too
        payload = {"problems": payload}
    if not isinstance(payload.get("problems"), list) or not payload["problems"]:
        sys.exit("error: export contains no 'problems' array")
    return payload


def validate(problems: list[dict]) -> list[dict]:
    """Drop anything we cannot file honestly, and say so loudly."""
    good, rejected = [], []
    seen_slugs: set[str] = set()

    for p in problems:
        slug = p.get("titleSlug") or p.get("title") or "<unknown>"
        if not p.get("code"):
            rejected.append((slug, "no source code in export"))
            continue
        if not p.get("title"):
            rejected.append((slug, "no problem title"))
            continue
        if not p.get("questionId"):
            rejected.append((slug, "no problem number"))
            continue
        if slug in seen_slugs:
            rejected.append((slug, "duplicate entry"))
            continue
        seen_slugs.add(slug)
        good.append(p)

    if rejected:
        print(f"\n  {len(rejected)} entr{'y' if len(rejected) == 1 else 'ies'} skipped "
              f"(nothing was invented to replace them):", file=sys.stderr)
        for slug, why in rejected:
            print(f"    - {slug}: {why}", file=sys.stderr)
        print(file=sys.stderr)
    return good


def write_solutions(problems: list[dict], root: Path) -> dict[str, list[dict]]:
    by_topic: dict[str, list[dict]] = defaultdict(list)

    for p in problems:
        topic = pick_topic(p.get("topicTags", []))
        number = int(p["questionId"])
        filename = f"{number:04d} - {safe_filename(p['title'])}.java"
        folder = root / topic
        folder.mkdir(parents=True, exist_ok=True)
        # verbatim: the exported accepted submission, unmodified
        (folder / filename).write_text(p["code"], encoding="utf-8", newline="")

        p["_topic"] = topic
        p["_number"] = number
        p["_path"] = f"{topic}/{filename}"
        by_topic[topic].append(p)

    for entries in by_topic.values():
        entries.sort(key=lambda e: e["_number"])
    return by_topic


def clean_old_topic_dirs(root: Path) -> None:
    """Remove previously generated topic folders so renames don't leave orphans."""
    known = {folder for folder, _ in TOPIC_PRIORITY} | {FALLBACK_TOPIC}
    for child in root.iterdir():
        if child.is_dir() and child.name in known:
            shutil.rmtree(child)


def md_link(text: str, target: str) -> str:
    from urllib.parse import quote
    return f"[{text}]({quote(target)})"


def build_readme(payload: dict, by_topic: dict[str, list[dict]], problems: list[dict]) -> str:
    diff_counts = Counter(p.get("difficulty") or "Unknown" for p in problems)
    total = len(problems)
    username = payload.get("username") or "ashwin1122"
    exported = (payload.get("exportedAt") or "")[:10]

    topic_order = [f for f, _ in TOPIC_PRIORITY if f in by_topic]
    topic_order += sorted(t for t in by_topic if t not in topic_order)

    L: list[str] = []
    L.append("# LeetCode Java Solutions")
    L.append("")
    L.append(f"My accepted Java solutions to LeetCode problems, exported directly from my "
             f"[LeetCode account](https://leetcode.com/u/{username}/) and organised by topic.")
    L.append("")
    L.append("Every file in this repository is the exact source of an **accepted submission** "
             "on my account, written by me. Nothing here is generated, borrowed or reconstructed.")
    L.append("")

    # ---- stats ----
    L.append("## 📊 Progress")
    L.append("")
    solved_all = payload.get("solvedAllLanguages")
    if solved_all and solved_all != total:
        L.append(f"**{total} Java solutions** in this repository — "
                 f"out of **{solved_all} problems solved** on LeetCode "
                 f"([the difference](#-solved-but-not-in-this-repository) was solved "
                 f"in another language).")
    else:
        L.append(f"**Total solved: {total}**")
    L.append("")
    L.append("| Difficulty | Solved | Share |")
    L.append("| :--- | ---: | ---: |")
    for d in DIFFICULTY_ORDER:
        n = diff_counts.get(d, 0)
        pct = (n / total * 100) if total else 0
        L.append(f"| {DIFFICULTY_BADGE[d]} | {n} | {pct:.0f}% |")
    if diff_counts.get("Unknown"):
        L.append(f"| ⚪ Unknown | {diff_counts['Unknown']} | — |")
    L.append(f"| **Total** | **{total}** | **100%** |")
    L.append("")

    # simple text progress bars
    L.append("```text")
    width = 30
    for d in DIFFICULTY_ORDER:
        n = diff_counts.get(d, 0)
        filled = round(n / total * width) if total else 0
        L.append(f"{d:<7} {'█' * filled}{'░' * (width - filled)} {n:>3}")
    L.append("```")
    L.append("")

    # ---- topic breakdown ----
    L.append("## 🧩 Topic Breakdown")
    L.append("")
    L.append("| Topic | Problems | Easy | Medium | Hard |")
    L.append("| :--- | ---: | ---: | ---: | ---: |")
    for topic in topic_order:
        entries = by_topic[topic]
        c = Counter(e.get("difficulty") for e in entries)
        L.append(f"| {md_link(topic, topic)} | {len(entries)} | "
                 f"{c.get('Easy', 0)} | {c.get('Medium', 0)} | {c.get('Hard', 0)} |")
    L.append(f"| **Total** | **{total}** | "
             f"**{diff_counts.get('Easy', 0)}** | **{diff_counts.get('Medium', 0)}** | "
             f"**{diff_counts.get('Hard', 0)}** |")
    L.append("")

    # ---- structure ----
    L.append("## 📁 Repository Structure")
    L.append("")
    L.append("```text")
    L.append("LeetCode-Java-Solutions/")
    for topic in topic_order:
        L.append(f"├── {topic}/")
        entries = by_topic[topic]
        shown = entries[:3]
        for j, e in enumerate(shown):
            leaf = "└──" if (j == len(shown) - 1 and len(entries) <= 3) else "├──"
            L.append(f"│   {leaf} {e['_number']:04d} - {safe_filename(e['title'])}.java")
        if len(entries) > 3:
            L.append(f"│   └── … and {len(entries) - 3} more")
    L.append("├── tools/")
    L.append("│   ├── export-leetcode.js   # pulls accepted Java submissions from my account")
    L.append("│   └── organize.py          # files them by topic and rebuilds this README")
    L.append("└── README.md")
    L.append("```")
    L.append("")

    # ---- full tracker ----
    L.append("## ✅ Solved Problems")
    L.append("")
    L.append("| # | Problem | Difficulty | Topic | Solution |")
    L.append("| ---: | :--- | :--- | :--- | :--- |")
    for p in sorted(problems, key=lambda e: e["_number"]):
        badge = DIFFICULTY_BADGE.get(p.get("difficulty"), "⚪ Unknown")
        url = p.get("url") or f"https://leetcode.com/problems/{p['titleSlug']}/"
        tags = ", ".join(p.get("topicTags", [])[:3]) or "—"
        L.append(f"| {p['_number']} | [{p['title']}]({url}) | {badge} | {tags} | "
                 f"{md_link('Java', p['_path'])} |")
    L.append("")

    # ---- solved but not exported ----
    unaccounted = payload.get("unaccountedFor") or []
    if unaccounted:
        solved_total = payload.get("solvedAllLanguages") or (total + len(unaccounted))
        L.append("## 📝 Solved but Not in This Repository")
        L.append("")
        L.append(f"LeetCode records **{solved_total} solved problems** on my account, and "
                 f"**{total}** of them are here. The {len(unaccounted)} below have no accepted "
                 "Java submission to publish — either solved in another language, or a "
                 "database problem where SQL is the only option. They are listed rather than "
                 "dropped, so the two counts reconcile.")
        L.append("")
        L.append("| # | Problem | Difficulty | Status |")
        L.append("| ---: | :--- | :--- | :--- |")
        for u in sorted(unaccounted, key=lambda x: int(x.get("questionId") or 0)):
            badge = DIFFICULTY_BADGE.get(u.get("difficulty"), "⚪ Unknown")
            url = f"https://leetcode.com/problems/{u['titleSlug']}/"
            L.append(f"| {u.get('questionId', '?')} | [{u.get('title', '?')}]({url}) | "
                     f"{badge} | ⬜ TODO — no Java submission exported |")
        L.append("")

    # ---- how it's maintained ----
    L.append("## 🔄 How This Repository Is Maintained")
    L.append("")
    L.append("1. `tools/export-leetcode.js` runs in the browser DevTools console on an "
             "authenticated LeetCode session. It walks my submission history, keeps the "
             "**latest accepted Java submission per problem**, and downloads it as JSON "
             "along with each problem's number, difficulty and topic tags.")
    L.append("2. `tools/organize.py` reads that JSON, writes each solution verbatim to "
             "`<Topic>/<NNNN> - <Title>.java`, and regenerates this README.")
    L.append("")
    L.append("A problem is filed under the first matching topic in the priority list at the "
             "top of `organize.py`, so specific structures and techniques (Linked List, Trees, "
             "Binary Search) take precedence over the broad Array / String / Math tags. "
             "The full tag list for each problem is in the table above.")
    L.append("")
    L.append("```bash")
    L.append("python3 tools/organize.py leetcode-java-submissions.json")
    L.append("```")
    L.append("")

    L.append("## 🛠️ Language")
    L.append("")
    L.append("All solutions are written in **Java**.")
    L.append("")
    if exported:
        L.append("---")
        L.append("")
        L.append(f"<sub>Last updated from LeetCode on {exported}.</sub>")
    return "\n".join(L) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", type=Path, help="JSON file from tools/export-leetcode.js")
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent,
                    help="repository root (default: parent of tools/)")
    args = ap.parse_args()

    payload = load(args.export)
    problems = validate(payload["problems"])
    if not problems:
        sys.exit("error: nothing left to write after validation")

    root: Path = args.root
    clean_old_topic_dirs(root)
    by_topic = write_solutions(problems, root)
    (root / "README.md").write_text(build_readme(payload, by_topic, problems), encoding="utf-8")

    unaccounted = payload.get("unaccountedFor") or []
    if unaccounted:
        print(f"\nnote: {len(unaccounted)} problem(s) you have solved produced no Java "
              f"submission and are NOT in this repository:")
        for u in unaccounted:
            print(f"  {u.get('questionId', '?'):>4}  {u.get('title', '?')}")
        print("  (solved in another language, most likely -- nothing was invented "
              "to fill these in)\n")

    counts = Counter(p.get("difficulty") for p in problems)
    print(f"wrote {len(problems)} solutions across {len(by_topic)} topics")
    print(f"  Easy {counts.get('Easy', 0)} | Medium {counts.get('Medium', 0)} | "
          f"Hard {counts.get('Hard', 0)}")
    for topic in sorted(by_topic, key=lambda t: (-len(by_topic[t]), t)):
        print(f"  {topic:<24} {len(by_topic[topic])}")
    print("README.md regenerated")


if __name__ == "__main__":
    main()
