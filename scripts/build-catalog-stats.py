#!/usr/bin/env python3
"""Generate `src/data/catalog-stats.json`.

The landing page advertises real catalog sizes (question count, section split,
vocabulary deck size, practice tests). Importing the 35 MB question bank into a
page bundle just to count rows would be wasteful, so the counts are derived
here and checked in as a tiny JSON file.

Run this after changing `src/data/question-bank.json` or
`src/data/vocabulary.json`:

    python3 scripts/build-catalog-stats.py
"""
from __future__ import annotations

import collections
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "src", "data", "question-bank.json")
VOCAB = os.path.join(ROOT, "src", "data", "vocabulary.json")
SEED = os.path.join(ROOT, "src", "lib", "seed.ts")
OUT = os.path.join(ROOT, "src", "data", "catalog-stats.json")


def main() -> int:
    with open(BANK, "r", encoding="utf-8") as handle:
        bank = json.load(handle)
    with open(VOCAB, "r", encoding="utf-8") as handle:
        vocab = json.load(handle)
    with open(SEED, "r", encoding="utf-8") as handle:
        seed_src = handle.read()

    domains = collections.Counter(q.get("domain") for q in bank)
    skills = collections.Counter(q.get("skill") for q in bank)
    difficulties = collections.Counter(q.get("difficulty") for q in bank)

    practice_tests = len(re.findall(r"testNumber:\s*\d+", seed_src))

    stats = {
        "totalQuestions": len(bank),
        "mathQuestions": domains.get("Math", 0),
        "readingWritingQuestions": domains.get("Reading & Writing", 0),
        "skillCount": len([s for s in skills if s]),
        "difficulties": {k: v for k, v in sorted(difficulties.items()) if k},
        "vocabularyTerms": len(vocab),
        "practiceTests": practice_tests,
        "generatedFrom": [
            "src/data/question-bank.json",
            "src/data/vocabulary.json",
            "src/lib/seed.ts",
        ],
    }

    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(stats, handle, indent=2)
        handle.write("\n")

    print(f"✔ wrote {OUT}")
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
