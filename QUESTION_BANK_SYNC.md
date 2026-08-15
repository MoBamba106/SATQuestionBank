# Question Bank Sync

The question bank ships as a checked-in snapshot at `src/data/question-bank.json`
(currently **3,444 questions**) and is loaded into Postgres by
`src/lib/seed.ts` during `npm run db:seed`.

## Status: the ~300 new College Board questions are NOT yet imported

They could not be fetched from the environment this change was made in:
outbound TLS to `qbank-api.collegeboard.org` and `saic.collegeboard.org` is
blocked there (`SSL_ERROR_SYSCALL` on connect). Rather than inserting
placeholder or invented questions, the import was left to be run from a machine
with network access, and the tooling to do it safely is included.

Run this from a normal dev machine:

```bash
# 1. See what College Board has that we don't (no files are written)
npx tsx scripts/cb-sync.ts --dry-run

# 2. Fetch + merge the missing questions (backs up the old bank first)
npx tsx scripts/cb-sync.ts

# 3. Validate before committing
npx tsx scripts/validate-question-bank.ts

# 4. Refresh the landing-page catalog counts
python3 scripts/build-catalog-stats.py

# 5. Load into the database
npm run db:seed
```

## How the pipeline works

| Stage | Where |
|-------|-------|
| Fetch from College Board | `scripts/cb-sync.ts` |
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
total              3444
unique ids         3444
by domain          {"Math":1756,"Reading & Writing":1688}
by difficulty      {"Hard":1068,"Easy":1240,"Medium":1136}
by type            {"free_response":421,"multiple_choice":3023}
with explanation   3444
with passage       1907
✔ question bank is valid
```

After importing the new questions the total should rise to roughly 3,744 with
`unique ids == total` and no validation errors.
