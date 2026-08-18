import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { practiceTestQuestions, practiceTests } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { queryQuestions } from "@/lib/server-questions";
import { ALL_BLUEPRINT_SKILLS, buildPracticeTestModules } from "@/lib/practice-test-blueprint";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const results = await Promise.all(
      ALL_BLUEPRINT_SKILLS.map((skill) =>
        queryQuestions({
          userId: user.id,
          where: sql`q.skill = ${skill}`,
          orderBy: sql`ORDER BY random()`,
          limit: 320,
        }),
      ),
    );
    const modules = buildPracticeTestModules(results.flat(), Math.random);
    if (!modules) {
      throw new Error("Not enough unique official questions to build a full-length adaptive test.");
    }

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
      const existingCount = Number((existing as unknown as { rows?: { c: number }[] }).rows?.[0]?.c ?? 0);
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
