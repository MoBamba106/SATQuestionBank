import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

import { z } from "zod";
import { sanitizeOptionalString, sanitizeString } from "@/lib/validation";

const attemptItemSchema = z.object({
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
  answer: sanitizeOptionalString,
});

const attemptsBodySchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  mode: z.enum(["practice", "exam", "test"]).catch("practice"),
  attempts: z.array(attemptItemSchema).optional(),
  questionId: z.string().optional(),
  isCorrect: z.boolean().optional(),
  answer: sanitizeOptionalString,
  /**
   * "I was actually right" override: flips an already-graded wrong attempt in
   * this session to correct instead of inserting a (silently ignored) second
   * row. Keeps one attempt per (session, question) so global accuracy stats
   * recalculate and the question leaves the mistake bank.
   */
  override: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const body = await req.json();
    
    const parsed = attemptsBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    
    const { sessionId, mode, override } = parsed.data;

    const session = await db.execute(sql`
      SELECT 1 FROM quiz_sessions WHERE id = ${sessionId} AND user_id = ${user.id} LIMIT 1
    `);
    if (((session as unknown as { rows: unknown[] }).rows ?? []).length === 0)
      return NextResponse.json({ error: "Session not found — start a new quiz" }, { status: 404 });

    const list = parsed.data.attempts ?? [{ questionId: parsed.data.questionId, isCorrect: parsed.data.isCorrect, answer: parsed.data.answer }];

    let recorded = 0;
    let duplicates = 0;
    let overridden = 0;
    for (const a of list) {
      const qid = String(a?.questionId ?? "");
      if (!qid || typeof a?.isCorrect !== "boolean") continue;

      // "I was actually right": update the existing graded row (unique per
      // session + question) instead of inserting a duplicate that would be
      // swallowed by ON CONFLICT and leave the wrong attempt in place.
      if (override) {
        const res = await db.execute(sql`
          UPDATE attempts
          SET is_correct = true,
              answer = COALESCE(${a.answer != null ? String(a.answer) : null}, answer),
              mode = ${mode}
          WHERE session_id = ${sessionId} AND question_id = ${qid}
          RETURNING id
        `);
        const rows = (res as unknown as { rows: { id: number }[] }).rows ?? [];
        if (rows.length > 0) {
          overridden++;
          continue;
        }
        // No prior attempt in this session — record it as correct outright.
        const ins = await db.execute(sql`
          INSERT INTO attempts (session_id, question_id, is_correct, answer, mode)
          VALUES (${sessionId}, ${qid}, true, ${a.answer != null ? String(a.answer) : null}, ${mode})
          ON CONFLICT (session_id, question_id) DO NOTHING
          RETURNING id
        `);
        const insRows = (ins as unknown as { rows: { id: number }[] }).rows ?? [];
        if (insRows.length > 0) recorded++;
        else overridden++;
        continue;
      }

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
    return NextResponse.json({ recorded, duplicates, overridden });
  } catch (e) {
    console.error("[api/attempts] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to record attempt" }, { status: 500 });
  }
}
