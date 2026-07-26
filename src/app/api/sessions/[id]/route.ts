import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const { id } = await ctx.params;
    const s = await db.execute(sql`
      SELECT id, mode, label, test_id AS "testId", total_questions AS "totalQuestions",
             correct_count AS "correctCount", answered_count AS "answeredCount",
             adaptive_path AS "adaptivePath",
             started_at AS "startedAt", finished_at AS "finishedAt"
      FROM quiz_sessions WHERE id = ${id} LIMIT 1
    `);
    const session = ((s as unknown as { rows: Record<string, unknown>[] }).rows ?? [])[0];
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const a = await db.execute(sql`
      SELECT question_id AS "questionId", is_correct AS "isCorrect", answer, created_at AS "createdAt"
      FROM attempts WHERE session_id = ${id} ORDER BY created_at ASC
    `);
    return NextResponse.json({ ...session, attempts: (a as unknown as { rows: unknown[] }).rows ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await ensureSeeded();
    const { id } = await ctx.params;
    const body = await req.json();
    const correct = body?.correctCount != null ? Number(body.correctCount) : null;
    const answered = body?.answeredCount != null ? Number(body.answeredCount) : null;
    const path = body?.adaptivePath;
    const adaptivePath = path?.rw && path?.math
      ? JSON.stringify({ rw: String(path.rw), math: String(path.math) })
      : null;
    const shouldFinish = body?.finish === true || correct != null || answered != null;
    await db.execute(sql`
      UPDATE quiz_sessions
      SET correct_count = COALESCE(${correct}, correct_count),
          answered_count = COALESCE(${answered}, answered_count),
          adaptive_path = COALESCE(${adaptivePath}::jsonb, adaptive_path),
          finished_at = CASE WHEN ${shouldFinish} THEN COALESCE(finished_at, now()) ELSE finished_at END
      WHERE id = ${id}
    `);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to finish session" }, { status: 500 });
  }
}
