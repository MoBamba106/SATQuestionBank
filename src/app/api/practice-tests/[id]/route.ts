import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { QUESTION_SELECT, QUESTION_JOINS, mapRow } from "@/lib/server-questions";
import type { PracticeTestDetail, SATQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const { id } = await ctx.params;

    const metaRes = await db.execute(sql`
      SELECT id, test_number AS "testNumber", title, release_label AS "releaseLabel",
             rw_minutes AS "rwMinutes", math_minutes AS "mathMinutes"
      FROM practice_tests WHERE id = ${id} LIMIT 1
    `);
    const meta = ((metaRes as unknown as { rows: Record<string, unknown>[] }).rows ?? [])[0];
    if (!meta) return NextResponse.json({ error: "Practice test not found" }, { status: 404 });

    const qRes = await db.execute(sql`
      SELECT p.module, p.position, ${QUESTION_SELECT}
      FROM practice_test_questions p
      JOIN questions q ON q.id = p.question_id
      ${QUESTION_JOINS}
      WHERE p.test_id = ${id}
      ORDER BY p.position ASC
    `);
    const rows = (qRes as unknown as { rows: Record<string, unknown>[] }).rows ?? [];

    const modules: PracticeTestDetail["modules"] = { rw1: [], rw2: [], math1: [], math2: [] };
    for (const r of rows) {
      const mod = String(r.module) as keyof PracticeTestDetail["modules"];
      if (modules[mod]) modules[mod].push(mapRow(r));
    }
    const flat = [...modules.rw1, ...modules.rw2, ...modules.math1, ...modules.math2];
    const detail: PracticeTestDetail = {
      ...(meta as unknown as Omit<PracticeTestDetail, "modules" | "totalQuestions" | "rwQuestions" | "mathQuestions">),
      modules,
      totalQuestions: flat.length,
      rwQuestions: modules.rw1.length + modules.rw2.length,
      mathQuestions: modules.math1.length + modules.math2.length,
    } as PracticeTestDetail & { modules: Record<string, SATQuestion[]> };
    return NextResponse.json(detail);
  } catch (e) {
    console.error("[api/practice-tests/id] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load practice test" }, { status: 500 });
  }
}
