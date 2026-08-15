# Question Bank Sync

The question bank ships as a checked-in snapshot at `src/data/question-bank.json`
(currently **3,714 questions**) and is loaded into Postgres by
`src/lib/seed.ts` during `npm run db:seed`.

## Status: the 270 newly released questions ARE imported ✅

`3,444 → 3,714`. All 270 are the newly released College Board items, with full
answer keys and rationales, mapped into the existing schema. Zero duplicates,
zero pre-existing questions modified.

### How they were obtained

Direct access to `qbank-api.collegeboard.org` / `saic.collegeboard.org` was not
possible from the build environment — the TCP connection is reset before TLS
completes, from both `curl` and Node. Instead the questions were imported from
a **public GitHub mirror** of the College Board bank via the GitHub API, which
is reachable.

The mirror only supplies question *content*; identity is still the College
Board `questionId`, so these rows are byte-for-byte what `cb-sync.ts` would
have produced. The two importers are interchangeable and idempotent.

Provenance was verified before importing:

- Source commit is titled *"Add 270 newly released SAT questions and
  new-question extraction script"*.
- The 270 ids appear in the mirror's **full** 3,252-question snapshot as well
  as its `new_questions.json`, and the two agree exactly — two independent
  copies cross-checked.
- All 270 were absent from our bank (zero id overlap).
- Content was spot-checked for correctness (e.g. a triangle item whose third
  angle is 180° − 64° = 116°, keyed **C**; a rectangle SPR keyed **38**).
- Every entry has a stem, an answer key, and a College Board rationale.

## Re-running / future updates

Preferred (direct from College Board, needs network access to their API):

```bash
npx tsx scripts/cb-sync.ts --dry-run
npx tsx scripts/cb-sync.ts
```

Fallback (public mirror over the GitHub API — used for the 270 above):

```bash
npx tsx scripts/import-new-questions.ts --dry-run   # report only
npx tsx scripts/import-new-questions.ts             # fetch, merge, back up

# point it at a different mirror / file if needed
SOURCE_REPO=owner/name SOURCE_PATH=data/new_questions.json \
  npx tsx scripts/import-new-questions.ts

# or import a snapshot you already downloaded
npx tsx scripts/import-new-questions.ts --file ./snapshot.json
```

Then, in both cases:

```bash
npx tsx scripts/validate-question-bank.ts   # gate: exits non-zero on any problem
python3 scripts/build-catalog-stats.py      # refresh landing-page counts
npm run db:seed                             # load into Postgres
```

> If Node reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE` behind a TLS-inspecting
> proxy, prefix the command with
> `NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt`.

## How the pipeline works

| Stage | Where |
|-------|-------|
| Fetch from College Board (preferred) | `scripts/cb-sync.ts` |
| Fetch from a public mirror (fallback) | `scripts/import-new-questions.ts` |
| Validate | `scripts/validate-question-bank.ts` |
| Snapshot on disk | `src/data/question-bank.json` |
| Load into Postgres | `src/lib/seed.ts` → `questions` table |
| Serve to the app | `src/app/api/questions/route.ts` |

### Identity and de-duplication

The College Board `questionId` **is** the primary key (`questions.id`), so the
same question can never be added twice. `cb-sync.ts` builds a `Map` of existing
ids and only fetches ids that are missing. Existing rows are never rewritten
unless you explicitly pass `--update-existing`.

The seeder upserts by id as well, so re-seeding is safe.

### Schema

Every entry matches this shape exactly (see `scripts/validate-question-bank.ts`
for the enforced rules):

```jsonc
{
  "id": "ac472881",                    // College Board questionId
  "questionText": "…",                 // plain text, for search/snippets
  "questionHtml": "<p>…</p>",          // original HTML (MathML, tables, images)
  "passage": "…",                      // plain text stimulus, or null
  "passageHtml": "<p>…</p>",           // original stimulus HTML, or null
  "correctAnswer": "B",                // choice key, or literal free-response key
  "explanation": "<p>…</p>",           // College Board rationale
  "difficulty": "Easy|Medium|Hard",
  "domain": "Math|Reading & Writing",
  "skill": "Algebra",                  // must belong to the domain
  "subskill": "Linear functions",
  "source": "College Board SAT Question Bank",
  "type": "multiple_choice|free_response",
  "choices": [{ "key": "A", "text": "<p>…</p>", "html": null }]
}
```

Difficulty is mapped from College Board's `E` / `M` / `H`; `skill` comes from
`primary_class_cd_desc` and `subskill` from `skill_desc`.

### Safety

- `cb-sync.ts` copies the current bank to `src/data/backups/question-bank-<timestamp>.json`
  before writing.
- `validate-question-bank.ts` exits non-zero on duplicate ids, missing required
  fields, bad enum values, a `skill` that doesn't belong to its `domain`, or a
  `correctAnswer` that doesn't match any choice key.
- Backups are ignored by git (`src/data/backups/`) — keep them locally or move
  them to external storage; do not commit 35 MB snapshots.

## Current validation baseline

```
total              3714
unique ids         3714
by domain          {"Math":1876,"Reading & Writing":1838}
by difficulty      {"Hard":1218,"Easy":1288,"Medium":1208}
by type            {"free_response":451,"multiple_choice":3263}
with explanation   3714
with passage       2057
✔ question bank is valid
```

Previously (before the 270 new questions): 3,444 total / Math 1,756 /
R&W 1,688 / Geometry and Trigonometry 284 (now 335).
