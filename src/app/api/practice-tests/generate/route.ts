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
const ROUTING = ["Medium", "Easy", "Medium", "Hard", "Medium", "Easy", "Medium", "Hard"];
const EASIER = ["Easy", "Medium", "Easy", "Medium", "Easy", "Medium", "Hard"];
const HARDER = ["Hard", "Medium", "Hard", "Hard", "Medium", "Hard", "Easy"];

function buildModule(
  pools: Map<string, SATQuestion[]>,
  used: Set<string>,
  blueprint: [string, number][],
  pattern: string[],
) {
  const output: SATQuestion[] = [];
  let patternIndex = 0;
  for (const [skill, count] of blueprint) {
    const pool = pools.get(skill) ?? [];
    for (let index = 0; index < count; index++) {
      const wanted = pattern[patternIndex++ % pattern.length];
      const question = pool.find((item) => !used.has(item.id) && item.difficulty === wanted)
        ?? pool.find((item) => !used.has(item.id));
      if (!question) throw new Error(`Not enough unique ${skill} questions to generate this test`);
      used.add(question.id);
      output.push(question);
    }
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
      rw1: buildModule(pools, used, RW_SKILLS, ROUTING),
      rw2_easy: buildModule(pools, used, RW_SKILLS, EASIER),
      rw2_hard: buildModule(pools, used, RW_SKILLS, HARDER),
      math1: buildModule(pools, used, MATH_SKILLS, ROUTING),
      math2_easy: buildModule(pools, used, MATH_SKILLS, EASIER),
      math2_hard: buildModule(pools, used, MATH_SKILLS, HARDER),
    };

    const id = `generated-${crypto.randomUUID()}`;
    const generatedAt = new Date();
    const title = `Generated Practice Test · ${generatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Detroit" })}`;
    const rows: { testId: string; position: number; module: string; questionId: string }[] = [];
    let position = 0;
    for (const [module, questions] of Object.entries(modules)) {
      for (const question of questions) rows.push({ testId: id, position: position++, module, questionId: question.id });
    }

    await db.transaction(async (tx) => {
      await tx.insert(practiceTests).values({
        id,
        userId: user.id,
        testNumber: 1_000_000 + Number(String(Date.now()).slice(-6)),
        title,
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

    return NextResponse.json({ id, title, totalQuestions: 98 });
  } catch (error) {
    console.error("[api/practice-tests/generate] POST failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate practice test" },
      { status: 500 },
    );
  }
}
