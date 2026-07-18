import fs from "node:fs";
import path from "node:path";
import { db } from "@/db";
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

const MOD1_PATTERN = ["Medium", "Easy", "Medium", "Hard", "Medium", "Medium", "Easy", "Medium", "Hard"];
const MOD2_PATTERN = ["Medium", "Medium", "Hard", "Medium", "Hard", "Medium", "Easy", "Medium", "Hard"];

export const PRACTICE_TEST_META: { testNumber: number; title: string; releaseLabel: string }[] = [
  { testNumber: 3, title: "Practice Test 3", releaseLabel: "Legacy Bluebook test (retired Feb 2025)" },
  { testNumber: 4, title: "Practice Test 4", releaseLabel: "Available in Bluebook" },
  { testNumber: 5, title: "Practice Test 5", releaseLabel: "Released March 2024" },
  { testNumber: 6, title: "Practice Test 6", releaseLabel: "Released March 2024" },
  { testNumber: 7, title: "Practice Test 7", releaseLabel: "Released February 2025 — all-new content" },
  { testNumber: 8, title: "Practice Test 8", releaseLabel: "Released February 2025" },
  { testNumber: 9, title: "Practice Test 9", releaseLabel: "Released February 2025" },
  { testNumber: 10, title: "Practice Test 10", releaseLabel: "Released February 2025" },
  { testNumber: 11, title: "Practice Test 11", releaseLabel: "Released February 2026 — newest" },
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
  if (!seededState.promise) seededState.promise = doSeed();
  return seededState.promise;
}

async function doSeed() {
  // --- questions ---
  const qCount = await db.execute(sql`select count(*)::int as c from questions`);
  const c = Number((qCount as unknown as { rows?: { c: number }[] }).rows?.[0]?.c ?? 0);

  let all: SeedQuestion[] = [];
  if (c === 0) {
    const file = path.join(process.cwd(), "src/data/question-bank.json");
    all = JSON.parse(fs.readFileSync(file, "utf8"));
    const BATCH = 100;
    for (let i = 0; i < all.length; i += BATCH) {
      const chunk = all.slice(i, i + BATCH).map((q) => ({
        id: q.id,
        questionText: q.questionText ?? "",
        questionHtml: q.questionHtml,
        passage: q.passage,
        passageHtml: q.passageHtml,
        correctAnswer: q.correctAnswer,
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

  // --- practice tests 3-11 ---
  const tCount = await db.execute(sql`select count(*)::int as c from practice_tests`);
  const tc = Number((tCount as unknown as { rows?: { c: number }[] }).rows?.[0]?.c ?? 0);
  if (tc > 0) return;

  if (all.length === 0) {
    const file = path.join(process.cwd(), "src/data/question-bank.json");
    all = JSON.parse(fs.readFileSync(file, "utf8"));
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
    const rw1 = buildModule(pools, used, RW_MODULE_SKILLS, MOD1_PATTERN);
    const rw2 = buildModule(pools, used, RW_MODULE_SKILLS, MOD2_PATTERN);
    const m1 = buildModule(pools, used, MATH_MODULE_SKILLS, MOD1_PATTERN);
    const m2 = buildModule(pools, used, MATH_MODULE_SKILLS, MOD2_PATTERN);
    if (!rw1 || !rw2 || !m1 || !m2) continue;

    const testId = `test-${meta.testNumber}`;
    await db
      .insert(practiceTests)
      .values({
        id: testId,
        testNumber: meta.testNumber,
        title: meta.title,
        releaseLabel: meta.releaseLabel,
        rwMinutes: 64,
        mathMinutes: 70,
      })
      .onConflictDoNothing();

    const rows: { testId: string; position: number; module: string; questionId: string }[] = [];
    let pos = 0;
    for (const [mod, list] of [
      ["rw1", rw1],
      ["rw2", rw2],
      ["math1", m1],
      ["math2", m2],
    ] as [string, SeedQuestion[]][]) {
      for (const q of list) rows.push({ testId, position: pos++, module: mod, questionId: q.id });
    }
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(practiceTestQuestions).values(rows.slice(i, i + BATCH)).onConflictDoNothing();
    }
  }
}
