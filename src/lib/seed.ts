import fs from "node:fs";
import path from "node:path";
import { db, ensureDatabaseReady } from "@/db";
import { sql } from "drizzle-orm";
import { questions, practiceTests, practiceTestQuestions } from "@/db/schema";

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

// ---------- deterministic PRNG ----------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2 } as Record<string, number>;

// Official digital SAT module composition (approximate official blueprints)
const RW_MODULE_SKILLS: [string, number][] = [
  ["Craft and Structure", 8],
  ["Information and Ideas", 7],
  ["Standard English Conventions", 7],
  ["Expression of Ideas", 5],
];
const MATH_MODULE_SKILLS: [string, number][] = [
  ["Algebra", 8],
  ["Advanced Math", 7],
  ["Problem-Solving and Data Analysis", 4],
  ["Geometry and Trigonometry", 3],
];

const ROUTING_PATTERN = ["Medium", "Easy", "Medium", "Hard", "Medium", "Medium", "Easy", "Medium", "Hard"];
const EASIER_PATTERN = ["Easy", "Medium", "Easy", "Medium", "Easy", "Medium", "Easy", "Medium", "Hard"];
const HARDER_PATTERN = ["Hard", "Medium", "Hard", "Hard", "Medium", "Hard", "Medium", "Hard", "Easy"];

export const PRACTICE_TEST_META: { testNumber: number; title: string; releaseLabel: string }[] = [
  { testNumber: 3, title: "Practice Test 3", releaseLabel: "Format-matched to Bluebook Test 3 · built from the official question bank" },
  { testNumber: 4, title: "Practice Test 4", releaseLabel: "Format-matched to Bluebook Test 4 · built from the official question bank" },
  { testNumber: 5, title: "Practice Test 5", releaseLabel: "Format-matched to Bluebook Test 5 · built from the official question bank" },
  { testNumber: 6, title: "Practice Test 6", releaseLabel: "Format-matched to Bluebook Test 6 · built from the official question bank" },
  { testNumber: 7, title: "Practice Test 7", releaseLabel: "Format-matched to Bluebook Test 7 · built from the official question bank" },
  { testNumber: 8, title: "Practice Test 8", releaseLabel: "Format-matched to Bluebook Test 8 · built from the official question bank" },
  { testNumber: 9, title: "Practice Test 9", releaseLabel: "Format-matched to Bluebook Test 9 · built from the official question bank" },
  { testNumber: 10, title: "Practice Test 10", releaseLabel: "Format-matched to Bluebook Test 10 · built from the official question bank" },
  { testNumber: 11, title: "Practice Test 11", releaseLabel: "Format-matched to Bluebook Test 11 · built from the official question bank" },
];

function buildModule(
  pools: Map<string, SeedQuestion[]>,
  used: Set<string>,
  skills: [string, number][],
  pattern: string[],
): SeedQuestion[] | null {
  const out: SeedQuestion[] = [];
  let pi = 0;
  for (const [skill, count] of skills) {
    const pool = pools.get(skill) ?? [];
    for (let i = 0; i < count; i++) {
      const wantDiff = pattern[pi % pattern.length];
      pi++;
      let q = pool.find((x) => !used.has(x.id) && x.difficulty === wantDiff);
      if (!q) q = pool.find((x) => !used.has(x.id));
      if (!q) return null;
      used.add(q.id);
      out.push(q);
    }
  }
  // Sort into skill blocks, ascending difficulty within a block (like the real test)
  const order: string[] = skills.map(([s]) => s);
  out.sort((a, b) => {
    const so = order.indexOf(a.skill) - order.indexOf(b.skill);
    if (so !== 0) return so;
    return (DIFF_ORDER[a.difficulty] ?? 1) - (DIFF_ORDER[b.difficulty] ?? 1);
  });
  return out;
}

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
  const tCount = await db.execute(sql`select count(*)::int as c from practice_tests`);
  const tc = Number((tCount as unknown as { rows?: { c: number }[] }).rows?.[0]?.c ?? 0);
  const moduleCount = await db.execute(sql`
    SELECT COUNT(DISTINCT module)::int AS c FROM practice_test_questions
    WHERE module IN ('rw1', 'rw2_easy', 'rw2_hard', 'math1', 'math2_easy', 'math2_hard')
  `);
  const adaptiveModules = Number((moduleCount as unknown as { rows?: { c: number }[] }).rows?.[0]?.c ?? 0);
  if (tc > 0 && adaptiveModules === 6) {
    // Keep release labels honest on already-seeded databases.
    for (const meta of PRACTICE_TEST_META) {
      await db.execute(sql`
        UPDATE practice_tests SET release_label = ${meta.releaseLabel}
        WHERE id = ${`test-${meta.testNumber}`} AND release_label IS DISTINCT FROM ${meta.releaseLabel}
      `);
    }
    return;
  }

  // Upgrade databases seeded by the older non-adaptive implementation.
  if (tc > 0) {
    await db.execute(sql`DELETE FROM practice_test_questions`);
    await db.execute(sql`DELETE FROM practice_tests`);
  }

  for (const meta of PRACTICE_TEST_META) {
    const rnd = mulberry32(meta.testNumber * 7919 + 13);
    // per-test shuffled pools keyed by skill
    const skills = [...RW_MODULE_SKILLS, ...MATH_MODULE_SKILLS].map(([s]) => s);
    const pools = new Map<string, SeedQuestion[]>();
    for (const s of skills) {
      pools.set(s, shuffled(all.filter((q) => q.skill === s), rnd));
    }
    const used = new Set<string>();
    const rw1 = buildModule(pools, used, RW_MODULE_SKILLS, ROUTING_PATTERN);
    const rw2Easy = buildModule(pools, used, RW_MODULE_SKILLS, EASIER_PATTERN);
    const rw2Hard = buildModule(pools, used, RW_MODULE_SKILLS, HARDER_PATTERN);
    const math1 = buildModule(pools, used, MATH_MODULE_SKILLS, ROUTING_PATTERN);
    const math2Easy = buildModule(pools, used, MATH_MODULE_SKILLS, EASIER_PATTERN);
    const math2Hard = buildModule(pools, used, MATH_MODULE_SKILLS, HARDER_PATTERN);
    if (!rw1 || !rw2Easy || !rw2Hard || !math1 || !math2Easy || !math2Hard) continue;

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
      ["rw1", rw1],
      ["rw2_easy", rw2Easy],
      ["rw2_hard", rw2Hard],
      ["math1", math1],
      ["math2_easy", math2Easy],
      ["math2_hard", math2Hard],
    ] as [string, SeedQuestion[]][]) {
      for (const q of list) rows.push({ testId, position: pos++, module: mod, questionId: q.id });
    }
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(practiceTestQuestions).values(rows.slice(i, i + BATCH)).onConflictDoNothing();
    }
  }
}
