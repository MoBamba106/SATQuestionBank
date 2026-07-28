import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const body = await req.json();
    const sessionId = String(body?.sessionId ?? "");
    const mode = String(body?.mode ?? "practice");
    if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

    const session = await db.execute(sql`
      SELECT 1 FROM quiz_sessions WHERE id = ${sessionId} AND user_id = ${user.id} LIMIT 1
    `);
    if (((session as unknown as { rows: unknown[] }).rows ?? []).length === 0)
      return NextResponse.json({ error: "Session not found — start a new quiz" }, { status: 404 });

    const list: { questionId: string; isCorrect: boolean; answer?: string }[] = Array.isArray(body?.attempts)
      ? body.attempts
      : [{ questionId: body?.questionId, isCorrect: body?.isCorrect, answer: body?.answer }];

    let recorded = 0;
    let duplicates = 0;
    for (const a of list) {
      const qid = String(a?.questionId ?? "");
      if (!qid || typeof a?.isCorrect !== "boolean") continue;
      const res = await db.execute(sql`
        INSERT INTO attempts (session_id, question_id, is_correct, answer, mode)
        VALUES (${sessionId}, ${qid}, ${a.isCorrect}, ${a.answer != null ? String(a.answer) : null}, ${mode})
        ON CONFLICT (session_id, question_id) DO NOTHING
        RETURNING id
      `);
      const rows = (res as unknown as { rows: { id: number }[] }).rows ?? [];
      if (rows.length > 0) recorded++;
      else duplicates++;
    }
    return NextResponse.json({ recorded, duplicates });
  } catch (e) {
    console.error("[api/attempts] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to record attempt" }, { status: 500 });
  }
}
