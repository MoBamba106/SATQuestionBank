#!/usr/bin/env python3
"""Build `src/data/vocabulary.json` from real SAT vocabulary-in-context questions.

Why this script exists
----------------------
The study library used to ship a generic academic word list. That deck was not
representative of the words students actually meet on the SAT. This script
rebuilds the deck from the *College Board "Words in Context" questions already
stored in this repository* (`src/data/question-bank.json`, subskill
"Words in Context"). Those are exactly the four-choice items where a student
must pick the word or phrase that best completes the text, so every term in the
generated deck is a word the College Board has actually tested.

Data sources (all already authorized / already vendored):

1. `src/data/question-bank.json` — the official College Board SAT question bank
   snapshot this app already ships. Provides:
     * the term (each of the four answer choices),
     * the College Board difficulty label for the question it came from,
     * the real SAT sentence the term appears in (used as the study example),
     * whether the term was the keyed answer or a tested distractor.
2. Existing `src/data/vocabulary.json` (the previous deck) — reused for IPA
   pronunciations and Merriam-Webster-aligned definitions where the term
   overlaps. See VOCABULARY_ATTRIBUTION.md.
3. Princeton WordNet 3.1 `dict/` files (optional, `--wordnet <dir>`) — glosses
   for terms the previous deck did not cover. WordNet is distributed under the
   permissive WordNet License. `npm pack wordnet-db` ships the same `dict/`.

Terms without a definition from source 2 or 3 are **skipped**, never invented.

Usage
-----
    python3 scripts/build-sat-vocabulary.py --wordnet /path/to/wordnet/dict
    python3 scripts/build-sat-vocabulary.py            # definitions from the old deck only
"""
from __future__ import annotations

import argparse
import collections
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "src", "data", "question-bank.json")
VOCAB = os.path.join(ROOT, "src", "data", "vocabulary.json")

WIC_SUBSKILL = "words in context"
DIFFICULTY_RANK = {"Easy": 0, "Medium": 1, "Hard": 2}
MAX_DEFINITIONS = 3

# Leading articles that College Board attaches to a choice ("An extraordinary").
ARTICLES = ("a ", "an ", "the ")

# The SAT also tests word + preposition collocations ("apprised of",
# "receptive to"). Those are kept as study terms, defined from their head word.
PREPOSITIONS = {
    "about", "above", "across", "after", "against", "along", "among", "around",
    "as", "at", "before", "behind", "below", "beneath", "beside", "between",
    "beyond", "by", "despite", "down", "during", "for", "from", "in", "inside",
    "into", "like", "near", "of", "off", "on", "onto", "out", "outside", "over",
    "past", "since", "through", "throughout", "to", "toward", "towards",
    "under", "until", "up", "upon", "with", "within", "without",
}

# Answer choices longer than this are full sentences, not vocabulary terms.
MAX_TERM_WORDS = 2


def plain_text(raw: str | None) -> str:
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html.unescape(text)
    text = text.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", text).strip()


def normalize_choice(raw: str) -> tuple[str, str]:
    """Return (display_term, lookup_key) for a raw answer-choice string."""
    text = plain_text(raw).strip().strip(".,;:")
    lowered = text.lower()
    for article in ARTICLES:
        if lowered.startswith(article):
            text = text[len(article):]
            break
    text = text.strip()
    # Choices are sentence-cased by the College Board renderer ("Correct",
    # "Sketch"). Study terms are stored lowercase so "Correct"/"correct" are
    # one card. Acronyms / all-caps forms keep their casing.
    if text and not text.isupper():
        text = text[0].lower() + text[1:]
    return text, text.lower()


def slugify(term: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-")


BLANK_RE = re.compile(r"_{3,}(?:\s*blank)?", re.IGNORECASE)


def context_sentence(passage: str, term: str) -> str | None:
    """The single SAT sentence containing the blank, with the term filled in."""
    if not passage:
        return None
    # Split on sentence boundaries but keep the terminator.
    sentences = re.split(r"(?<=[.!?])\s+", passage)
    target = next((s for s in sentences if BLANK_RE.search(s)), None)
    if not target:
        return None
    filled = BLANK_RE.sub(term, target, count=1).strip()
    # Guard against pathological lengths in the flashcard UI.
    if len(filled) > 320:
        return None
    return filled


# ---------------------------------------------------------------------------
# WordNet 3.1 gloss lookup (optional)
# ---------------------------------------------------------------------------
POS_FILES = {"noun": "noun", "verb": "verb", "adj": "adj", "adv": "adv"}


def clean_gloss(gloss: str) -> str:
    """Keep only WordNet's definition text, dropping quoted usage examples.

    A WordNet gloss looks like:
        make certain of; "This nest egg will ensure a nice retirement"
    Quoted examples belong in the `example` field (which we populate from the
    real SAT sentence instead), so they are stripped here.
    """
    # Everything from the first double-quote onward is usage examples.
    text = gloss.split('"', 1)[0]
    text = text.strip().strip(";").strip()
    # Trailing "-Author Name" attributions.
    text = re.sub(r"\s*-{1,2}[A-Z][\w.'’ -]+$", "", text).strip()
    # Collapse a dangling separator left after removing the examples.
    text = re.sub(r"[;,]\s*$", "", text).strip()
    return text


def load_wordnet(dict_dir: str) -> dict[str, list[str]]:
    """Map lemma -> ordered list of glosses (definition part only)."""
    if not dict_dir:
        return {}
    data: dict[str, dict[str, str]] = {}
    for pos in POS_FILES.values():
        path = os.path.join(dict_dir, f"data.{pos}")
        if not os.path.exists(path):
            print(f"  ! missing {path}", file=sys.stderr)
            continue
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                if line.startswith("  ") or "|" not in line:
                    continue
                offset = line.split(" ", 1)[0]
                gloss = line.split("|", 1)[1].strip()
                definition = clean_gloss(gloss)
                if definition:
                    data.setdefault(pos, {})[offset] = definition

    # `index.sense` carries per-sense corpus frequency (tag_cnt), which lets us
    # show the sense a student is most likely to meet first instead of an
    # arbitrary part-of-speech ordering.
    SS_TYPE_TO_POS = {"1": "noun", "2": "verb", "3": "adj", "4": "adv", "5": "adj"}
    ranked: dict[str, list[tuple[int, int, str]]] = {}
    sense_path = os.path.join(dict_dir, "index.sense")
    if os.path.exists(sense_path):
        with open(sense_path, "r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                parts = line.split()
                if len(parts) < 4:
                    continue
                sense_key, offset, sense_number, tag_cnt = parts[0], parts[1], parts[2], parts[3]
                lemma, _, rest = sense_key.partition("%")
                ss_type = rest.split(":", 1)[0]
                pos = SS_TYPE_TO_POS.get(ss_type)
                gloss = data.get(pos, {}).get(offset) if pos else None
                if not gloss:
                    continue
                try:
                    rank = (-int(tag_cnt), int(sense_number))
                except ValueError:
                    rank = (0, 99)
                ranked.setdefault(lemma.replace("_", " ").lower(), []).append((*rank, gloss))

    index: dict[str, list[str]] = {}
    for lemma, entries in ranked.items():
        entries.sort(key=lambda item: (item[0], item[1]))
        seen: set[str] = set()
        glosses: list[str] = []
        for _, _, gloss in entries:
            if gloss.lower() in seen:
                continue
            seen.add(gloss.lower())
            glosses.append(gloss)
        index[lemma] = glosses
    return index


# Simple inflection back-off so "acknowledged" can borrow "acknowledge".
def lemma_candidates(term: str) -> list[str]:
    out = [term]
    if term.endswith("ies") and len(term) > 4:
        out.append(term[:-3] + "y")
    if term.endswith("es") and len(term) > 3:
        out.append(term[:-2])
    if term.endswith("s") and not term.endswith("ss"):
        out.append(term[:-1])
    if term.endswith("ed") and len(term) > 3:
        out.append(term[:-2])
        out.append(term[:-1])
        if len(term) > 4 and term[-3] == term[-4]:
            out.append(term[:-3])
    if term.endswith("ing") and len(term) > 4:
        out.append(term[:-3])
        out.append(term[:-3] + "e")
        if len(term) > 5 and term[-4] == term[-5]:
            out.append(term[:-4])
    if term.endswith("ly") and len(term) > 4:
        out.append(term[:-2])
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wordnet", default=os.environ.get("WORDNET_DICT", ""),
                        help="Path to a WordNet 3.1 dict/ directory (optional).")
    parser.add_argument("--ipa", default=os.environ.get("IPA_DICT", ""),
                        help="Path to a JSON map of lemma -> IPA (from ipa-dict en_US, optional).")
    parser.add_argument("--out", default=VOCAB)
    args = parser.parse_args()

    print("→ reading question bank …")
    with open(BANK, "r", encoding="utf-8") as handle:
        bank = json.load(handle)

    wic = [q for q in bank if (q.get("subskill") or "").strip().lower() == WIC_SUBSKILL]
    print(f"  {len(wic)} College Board 'Words in Context' questions")

    # term key -> aggregated record
    records: dict[str, dict] = {}
    for question in wic:
        choices = question.get("choices") or []
        if len(choices) != 4:
            continue
        passage = plain_text(question.get("passage") or question.get("passageHtml"))
        answer_key = str(question.get("correctAnswer") or "").strip().upper()
        difficulty = question.get("difficulty") or "Medium"
        for choice in choices:
            term, key = normalize_choice(choice.get("text") or choice.get("html") or "")
            if not term or len(term) < 3:
                continue
            # Some Words-in-Context items offer whole clauses as choices
            # ("she often changed her mind"). Those are reading comprehension,
            # not vocabulary, so they never become flashcards.
            if len(term.split()) > MAX_TERM_WORDS:
                continue
            is_answer = str(choice.get("key", "")).strip().upper() == answer_key
            record = records.setdefault(key, {
                "term": term,
                "difficulty": difficulty,
                "answerCount": 0,
                "distractorCount": 0,
                "questionIds": [],
                "example": None,
            })
            # Keep the hardest College Board difficulty this term was tested at.
            if DIFFICULTY_RANK.get(difficulty, 1) > DIFFICULTY_RANK.get(record["difficulty"], 1):
                record["difficulty"] = difficulty
            if is_answer:
                record["answerCount"] += 1
                if not record["example"]:
                    record["example"] = context_sentence(passage, term)
            else:
                record["distractorCount"] += 1
            record["questionIds"].append(question["id"])

    print(f"  {len(records)} distinct tested terms/phrases")

    print("→ loading existing deck for pronunciations + definitions …")
    previous: dict[str, dict] = {}
    if os.path.exists(args.out):
        with open(args.out, "r", encoding="utf-8") as handle:
            for entry in json.load(handle):
                previous[str(entry.get("term", "")).lower()] = entry
    print(f"  {len(previous)} previous entries available for reuse")

    wordnet: dict[str, list[str]] = {}
    if args.wordnet:
        print(f"→ loading WordNet glosses from {args.wordnet} …")
        wordnet = load_wordnet(args.wordnet)
        print(f"  {len(wordnet)} WordNet lemmas")

    ipa: dict[str, str] = {}
    if args.ipa and os.path.exists(args.ipa):
        print(f"→ loading IPA pronunciations from {args.ipa} …")
        with open(args.ipa, "r", encoding="utf-8") as handle:
            ipa = json.load(handle)
        print(f"  {len(ipa)} pronunciations")

    out: list[dict] = []
    skipped: list[str] = []
    sources = collections.Counter()

    for key in sorted(records):
        record = records[key]
        term = record["term"]
        definitions: list[str] = []
        source = None

        # A collocation like "apprised of" is defined from its head word
        # ("apprised"); the preposition is part of the tested usage, not a
        # separate sense.
        words = key.split()
        head = words[0] if len(words) == 2 and words[1] in PREPOSITIONS else key

        prior = previous.get(key) or (previous.get(head) if head != key else None)
        if prior and prior.get("definition"):
            definitions = list(prior.get("definitions") or [prior["definition"]])
            source = "merriam-webster-aligned"
        else:
            for candidate in lemma_candidates(head):
                glosses = wordnet.get(candidate)
                if glosses:
                    seen: set[str] = set()
                    for gloss in glosses:
                        normalized = gloss.strip()
                        if normalized and normalized.lower() not in seen:
                            seen.add(normalized.lower())
                            definitions.append(normalized)
                        if len(definitions) >= MAX_DEFINITIONS:
                            break
                    source = "wordnet-3.1"
                    break

        if not definitions:
            skipped.append(term)
            continue

        definitions = definitions[:MAX_DEFINITIONS]
        sources[source] += 1

        entry: dict = {
            "id": f"v-{slugify(term)}",
            "term": term,
            "difficulty": record["difficulty"],
            "definition": definitions[0],
            "definitions": definitions,
        }
        phonetic = (prior or {}).get("phonetic") or ipa.get(key)
        if phonetic:
            entry["phonetic"] = phonetic
        if record["example"]:
            entry["example"] = record["example"]
        # SAT provenance — surfaced in the study UI and useful for regeneration.
        entry["satRole"] = "answer" if record["answerCount"] > 0 else "distractor"
        entry["satQuestionIds"] = sorted(set(record["questionIds"]))[:6]
        entry["source"] = "College Board SAT Question Bank · Words in Context"
        entry["definitionSource"] = source
        out.append(entry)

    # Stable, human-friendly ordering.
    out.sort(key=lambda item: item["term"].lower())

    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(out, handle, ensure_ascii=False, indent=1)
        handle.write("\n")

    print(f"\n✔ wrote {len(out)} entries → {args.out}")
    print(f"  definition sources: {dict(sources)}")
    print(f"  answers: {sum(1 for e in out if e['satRole'] == 'answer')} · "
          f"distractors: {sum(1 for e in out if e['satRole'] == 'distractor')}")
    print(f"  with SAT example sentence: {sum(1 for e in out if e.get('example'))}")
    print(f"  difficulty: {dict(collections.Counter(e['difficulty'] for e in out))}")
    if skipped:
        print(f"  skipped {len(skipped)} terms with no authorized definition "
              f"(e.g. {', '.join(skipped[:8])})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
