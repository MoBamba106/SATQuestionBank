# Vocabulary Data Attribution

`src/data/vocabulary.json` is an **SAT vocabulary deck derived from real SAT
questions**, not a generic academic word list.

## How the deck is built

Every term comes from the College Board **"Words in Context"** items already
stored in this repository (`src/data/question-bank.json`, `subskill = "Words in
Context"`). Those are the four-choice questions that ask students to pick the
word or phrase that "most logically and precisely completes the text", so the
deck only contains vocabulary the College Board has actually tested — both the
keyed answers and the distractors students must be able to rule out.

Regenerate with:

```bash
python3 scripts/build-sat-vocabulary.py \
  --wordnet /path/to/wordnet/dict \
  --ipa /path/to/ipa-en_US.json
```

Both optional inputs only supply *definitions and pronunciations*; the word list
itself always comes from the question bank. Terms with no definition available
from an authorized source are skipped rather than invented.

## Fields

| Field | Source |
|-------|--------|
| `term` | Answer choice text from a College Board Words-in-Context question |
| `difficulty` | The hardest College Board difficulty label the term was tested at |
| `example` | The real SAT sentence, with the blank filled by the term |
| `definition` / `definitions` | WordNet 3.1, or Merriam-Webster-aligned senses carried over from the previous deck |
| `phonetic` | ipa-dict `en_US` |
| `satRole` | `answer` if the term was ever the keyed answer, otherwise `distractor` |
| `satQuestionIds` | Question-bank ids the term appears in (up to 6) |
| `source` | Always `College Board SAT Question Bank · Words in Context` |
| `definitionSource` | `wordnet-3.1` or `merriam-webster-aligned` |

## Sources and licenses

- **College Board SAT Question Bank** — the question snapshot this app already
  ships, used here only to determine *which words the SAT tests*. See the app's
  DMCA / Terms pages for the question-content position.
- **Princeton WordNet 3.1** — definitions, distributed under the permissive
  WordNet License. Source: https://wordnet.princeton.edu/ (the `wordnet-db` npm
  package vendors the same `dict/` files).
- **ipa-dict** — United States English IPA pronunciations, ISC License.
  Source: https://github.com/open-dict-data/ipa-dict
- **Merriam-Webster-aligned senses** — concise paraphrases of primary senses
  that were hand-curated for the previous deck; retained where the term is still
  tested. See `scripts/mw_definitions_part*.py`.

## Previous deck

The earlier 600-word deck was generated from the New Academic Word List, Open
English WordNet 2025, ipa-dict, and wordfreq (see `scripts/build-vocabulary.py`
and `scripts/update-vocab-definitions.py`). That deck was replaced because its
words were not specific to the SAT. Its curated Merriam-Webster definitions are
still reused for the 38 overlapping terms.

Difficulty labels come from the College Board difficulty of the question the
term was tested in (`Easy` / `Medium` / `Hard`).
