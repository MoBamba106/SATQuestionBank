import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";
import { questionSelect, questionJoins, mapRow } from "@/lib/server-questions";
import type { PracticeTestDetail, SATQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const { id } = await ctx.params;

    const metaRes = await db.execute(sql`
      SELECT id, test_number AS "testNumber", title, release_label AS "releaseLabel",
             is_custom AS "isCustom", rw_minutes AS "rwMinutes", math_minutes AS "mathMinutes"
      FROM practice_tests WHERE id = ${id} LIMIT 1
    `);
    const meta = ((metaRes as unknown as { rows: Record<string, unknown>[] }).rows ?? [])[0];
    if (!meta) return NextResponse.json({ error: "Practice test not found" }, { status: 404 });

    const qRes = await db.execute(sql`
      SELECT p.module, p.position, ${questionSelect(user.id)}
      FROM practice_test_questions p
      JOIN questions q ON q.id = p.question_id
      ${questionJoins(user.id)}
      WHERE p.test_id = ${id}
      ORDER BY p.position ASC
    `);
    const rows = (qRes as unknown as { rows: Record<string, unknown>[] }).rows ?? [];

    const modules: PracticeTestDetail["modules"] = {
      rw1: [],
      rw2Easy: [],
      rw2Hard: [],
      math1: [],
      math2Easy: [],
      math2Hard: [],
    };
    const moduleMap: Record<string, keyof PracticeTestDetail["modules"]> = {
      rw1: "rw1",
      rw2_easy: "rw2Easy",
      rw2_hard: "rw2Hard",
      math1: "math1",
      math2_easy: "math2Easy",
      math2_hard: "math2Hard",
    };
    for (const row of rows) {
      const key = moduleMap[String(row.module)];
      if (key) modules[key].push(mapRow(row));
    }
    const rwQuestions = modules.rw1.length + modules.rw2Hard.length;
    const mathQuestions = modules.math1.length + modules.math2Hard.length;
    const detail: PracticeTestDetail = {
      ...(meta as unknown as Omit<PracticeTestDetail, "modules" | "totalQuestions" | "rwQuestions" | "mathQuestions">),
      modules,
      totalQuestions: rwQuestions + mathQuestions,
      rwQuestions,
      mathQuestions,
    } as PracticeTestDetail & { modules: Record<string, SATQuestion[]> };
    return NextResponse.json(detail);
  } catch (e) {
    console.error("[api/practice-tests/id] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load practice test" }, { status: 500 });
  }
}

/** Delete a generated (custom) practice test. Official Bluebook tests are protected. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const { id } = await ctx.params;

    const metaRes = await db.execute(sql`
      SELECT id, is_custom AS "isCustom", title
      FROM practice_tests WHERE id = ${id} LIMIT 1
    `);
    const meta = ((metaRes as unknown as { rows: Record<string, unknown>[] }).rows ?? [])[0];
    if (!meta) return NextResponse.json({ error: "Practice test not found" }, { status: 404 });
    if (!meta.isCustom) {
      return NextResponse.json(
        { error: "Official Bluebook practice tests cannot be deleted." },
        { status: 403 },
      );
    }

    const own = await db.execute(sql`
      SELECT 1 FROM practice_tests WHERE id = ${id} AND user_id = ${user.id} LIMIT 1
    `);
    if (((own as unknown as { rows: unknown[] }).rows ?? []).length === 0) {
      return NextResponse.json({ error: "Practice test not found" }, { status: 404 });
    }

    await db.execute(sql`DELETE FROM practice_tests WHERE id = ${id} AND user_id = ${user.id}`);
    return NextResponse.json({ ok: true, id, title: meta.title });
  } catch (e) {
    console.error("[api/practice-tests/id] DELETE failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete practice test" },
      { status: 500 },
    );
  }
}
