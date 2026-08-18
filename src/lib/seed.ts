import fs from "node:fs";
import path from "node:path";
import { db, ensureDatabaseReady } from "@/db";
import { sql } from "drizzle-orm";
import { questions, practiceTests, practiceTestQuestions } from "@/db/schema";
import {
  PRACTICE_TEST_BLUEPRINT_VERSION,
  buildPracticeTestModules,
  mulberry32,
  officialReleaseLabel,
} from "@/lib/practice-test-blueprint";

type SeedChoice = { key: string; text: string; html?: string | null };
type SeedQuestion = {
  id: string;
  questionText: string;
  questionHtml: string | null;
  passage: string | null;
  passageHtml: string | null;
  correctAnswer: string;
  explanation: string | null;
  difficulty: string;
  domain: string;
  skill: string;
  subskill: string | null;
  source: string | null;
  type: string;
  choices: SeedChoice[] | null;
};

export const PRACTICE_TEST_META: { testNumber: number; title: string; releaseLabel: string }[] = [
  3, 4, 5, 6, 7, 8, 9, 10, 11,
].map((testNumber) => ({
  testNumber,
  title: `Practice Test ${testNumber}`,
  releaseLabel: officialReleaseLabel(testNumber),
}));

const seededState: { promise: Promise<unknown> | null } = { promise: null };

export function ensureSeeded(): Promise<unknown> {
  if (!seededState.promise) {
    seededState.promise = doSeed().catch((error) => {
      seededState.promise = null;
      throw error;
    });
  }
  return seededState.promise;
}

function loadQuestionBank(): SeedQuestion[] {
  const file = path.join(process.cwd(), "src/data/question-bank.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as SeedQuestion[];
}

/**
 * Patch answers that were missing/blank in older DB seeds. Safe to re-run:
 * only overwrites rows whose correct_answer is still empty or matches a
 * known backfill key.
 */
async function backfillMissingAnswers(all: SeedQuestion[]) {
  // Only touch rows that are still blank (or the placeholder "?" from a prior seed).
  const emptyRes = await db.execute(
    sql`select id from questions where coalesce(trim(correct_answer), '') in ('', '?')`,
  );
  const emptyIds = new Set(
    ((emptyRes as unknown as { rows?: { id: string }[] }).rows ?? []).map((row) => row.id),
  );
  if (emptyIds.size === 0) return;

  const needs = all.filter(
    (q) => emptyIds.has(q.id) && String(q.correctAnswer || "").trim().length > 0,
  );
  for (const q of needs) {
    await db.execute(sql`
      UPDATE questions
      SET correct_answer = ${q.correctAnswer}
      WHERE id = ${q.id}
        AND coalesce(trim(correct_answer), '') in ('', '?')
    `);
  }
}

async function doSeed() {
  await ensureDatabaseReady();

  // --- questions ---
  const qCount = await db.execute(sql`select count(*)::int as c from questions`);
  const c = Number((qCount as unknown as { rows?: { c: number }[] }).rows?.[0]?.c ?? 0);

  const all = loadQuestionBank();

  // Bring the database up to the full bank whenever it has fewer questions than
  // the shipped data (e.g. a DB seeded from an older, smaller bank). Inserts
  // are idempotent (`onConflictDoNothing`), so this safely adds only the rows
  // that are missing and is a no-op once the DB already has them all. This is
  // what keeps the question-bank count and the homepage count in agreement.
  if (c < all.length) {
    const BATCH = 100;
    for (let i = 0; i < all.length; i += BATCH) {
      const chunk = all.slice(i, i + BATCH).map((q) => ({
        id: q.id,
        questionText: q.questionText ?? "",
        questionHtml: q.questionHtml,
        passage: q.passage,
        passageHtml: q.passageHtml,
        correctAnswer: q.correctAnswer || "?",
        explanation: q.explanation,
        difficulty: q.difficulty,
        domain: q.domain,
        skill: q.skill,
        subskill: q.subskill,
        source: q.source,
        type: q.type,
        choices: q.choices,
      }));
      await db.insert(questions).values(chunk).onConflictDoNothing();
    }
  }

  // Existing DBs may predate answer backfills — fill blanks in place.
  await backfillMissingAnswers(all);

  // --- practice tests 3-11 ---
  const versionMarker = `%blueprint ${PRACTICE_TEST_BLUEPRINT_VERSION}%`;
  const current = await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM practice_tests
    WHERE COALESCE(is_custom, false) = false
      AND release_label LIKE ${versionMarker}
  `);
  const onBlueprint = Number((current as unknown as { rows?: { c: number }[] }).rows?.[0]?.c ?? 0);
  if (onBlueprint === PRACTICE_TEST_META.length) return;

  // Rebuild official tests only — leave user-generated tests alone.
  await db.execute(sql`
    DELETE FROM practice_test_questions
    WHERE test_id IN (SELECT id FROM practice_tests WHERE COALESCE(is_custom, false) = false)
  `);
  await db.execute(sql`DELETE FROM practice_tests WHERE COALESCE(is_custom, false) = false`);

  for (const meta of PRACTICE_TEST_META) {
    const rnd = mulberry32(meta.testNumber * 7919 + 13);
    const modules = buildPracticeTestModules(all, rnd);
    if (!modules) continue;

    const testId = `test-${meta.testNumber}`;
    await db
      .insert(practiceTests)
      .values({
        id: testId,
        userId: null,
        testNumber: meta.testNumber,
        title: meta.title,
        releaseLabel: meta.releaseLabel,
        isCustom: false,
        rwMinutes: 64,
        mathMinutes: 70,
      })
      .onConflictDoNothing();

    const rows: { testId: string; position: number; module: string; questionId: string }[] = [];
    let pos = 0;
    for (const [mod, list] of [
      ["rw1", modules.rw1],
      ["rw2_easy", modules.rw2_easy],
      ["rw2_hard", modules.rw2_hard],
      ["math1", modules.math1],
      ["math2_easy", modules.math2_easy],
      ["math2_hard", modules.math2_hard],
    ] as [string, SeedQuestion[]][]) {
      for (const q of list) rows.push({ testId, position: pos++, module: mod, questionId: q.id });
    }
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(practiceTestQuestions).values(rows.slice(i, i + BATCH)).onConflictDoNothing();
    }
  }
}
