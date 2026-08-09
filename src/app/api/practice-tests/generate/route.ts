import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { practiceTestQuestions, practiceTests } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { queryQuestions } from "@/lib/server-questions";
import type { SATQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

const RW_SKILLS: [string, number][] = [
  ["Craft and Structure", 8],
  ["Information and Ideas", 7],
  ["Standard English Conventions", 7],
  ["Expression of Ideas", 5],
];
const MATH_SKILLS: [string, number][] = [
  ["Algebra", 8],
  ["Advanced Math", 7],
  ["Problem-Solving and Data Analysis", 4],
  ["Geometry and Trigonometry", 3],
];
const ROUTING = ["Easy", "Easy", "Medium", "Medium", "Medium", "Hard", "Hard"];
const EASIER = ["Easy", "Easy", "Easy", "Easy", "Medium", "Medium", "Hard"];
const HARDER = ["Easy", "Medium", "Medium", "Hard", "Hard", "Hard", "Hard"];

function buildModule(
  pools: Map<string, SATQuestion[]>,
  used: Set<string>,
  blueprint: [string, number][],
  pattern: string[],
  isMath: boolean
) {
  const output: SATQuestion[] = [];
  let patternIndex = 0;
  for (const [skill, count] of blueprint) {
    const pool = pools.get(skill) ?? [];
    const skillQuestions: SATQuestion[] = [];
    for (let index = 0; index < count; index++) {
      const wanted = pattern[patternIndex++ % pattern.length];
      const question = pool.find((item) => !used.has(item.id) && item.difficulty === wanted)
        ?? pool.find((item) => !used.has(item.id));
      if (!question) throw new Error(`Not enough unique ${skill} questions to generate this test`);
      used.add(question.id);
      skillQuestions.push(question);
    }
    if (!isMath) {
      skillQuestions.sort((a, b) => {
        const diff = { "Easy": 1, "Medium": 2, "Hard": 3 };
        return (diff[a.difficulty as keyof typeof diff] || 2) - (diff[b.difficulty as keyof typeof diff] || 2);
      });
    }
    output.push(...skillQuestions);
  }
  if (isMath) {
    output.sort((a, b) => {
      const diff = { "Easy": 1, "Medium": 2, "Hard": 3 };
      return (diff[a.difficulty as keyof typeof diff] || 2) - (diff[b.difficulty as keyof typeof diff] || 2);
    });
  }
  return output;
}

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const skills = [...RW_SKILLS, ...MATH_SKILLS].map(([skill]) => skill);
    const results = await Promise.all(
      skills.map(async (skill) => [
        skill,
        await queryQuestions({ where: sql`q.skill = ${skill}`, orderBy: sql`ORDER BY random()`, limit: 180 }),
      ] as const),
    );
    const pools = new Map(results);
    const used = new Set<string>();
    const modules = {
      rw1: buildModule(pools, used, RW_SKILLS, ROUTING, false),
      rw2_easy: buildModule(pools, used, RW_SKILLS, EASIER, false),
      rw2_hard: buildModule(pools, used, RW_SKILLS, HARDER, false),
      math1: buildModule(pools, used, MATH_SKILLS, ROUTING, true),
      math2_easy: buildModule(pools, used, MATH_SKILLS, EASIER, true),
      math2_hard: buildModule(pools, used, MATH_SKILLS, HARDER, true),
    };

    const id = `generated-${crypto.randomUUID()}`;
    const rows: { testId: string; position: number; module: string; questionId: string }[] = [];
    let position = 0;
    for (const [module, questions] of Object.entries(modules)) {
      for (const question of questions) rows.push({ testId: id, position: position++, module, questionId: question.id });
    }

    let finalTitle = "";
    await db.transaction(async (tx) => {
      const existing = await tx.execute(sql`
        SELECT COUNT(*) as c FROM practice_tests WHERE user_id = ${user.id} AND is_custom = true
      `);
      const existingCount = Number((existing as any).rows?.[0]?.c ?? 0);
      const generatedNumber = existingCount + 1;
      finalTitle = `Generated Practice Test ${generatedNumber}`;

      await tx.insert(practiceTests).values({
        id,
        userId: user.id,
        testNumber: generatedNumber,
        title: finalTitle,
        releaseLabel: "Algorithmically generated from the official question bank",
        isCustom: true,
        rwMinutes: 64,
        mathMinutes: 70,
      });
      const batchSize = 50;
      for (let index = 0; index < rows.length; index += batchSize) {
        await tx.insert(practiceTestQuestions).values(rows.slice(index, index + batchSize));
      }
    });

    return NextResponse.json({ id, title: finalTitle, totalQuestions: rows.length });
  } catch (error) {
    console.error("[api/practice-tests/generate] POST failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate practice test" },
      { status: 500 },
    );
  }
}
