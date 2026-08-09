import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getRequestUser(req);
    if (user.isGuest) return NextResponse.json({ ok: false, error: "Must be signed in" }, { status: 401 });

    const body = await req.json();
    const sessions = Array.isArray(body?.sessions) ? body.sessions : [];
    const attempts = Array.isArray(body?.attempts) ? body.attempts : [];

    if (sessions.length === 0 && attempts.length === 0) {
      return NextResponse.json({ ok: true, merged: 0 });
    }

    let merged = 0;
    
    for (const s of sessions) {
       await db.execute(sql`
         INSERT INTO quiz_sessions (id, user_id, mode, label, test_id, total_questions, created_at, finished_at, correct_count, answered_count, total_score, rw_score, math_score)
         VALUES (${s.id}, ${user.id}, ${s.mode}, ${s.label}, ${s.testId}, ${s.totalQuestions}, coalesce(${s.createdAt}::timestamp, now()), coalesce(${s.finishedAt}::timestamp, now()), coalesce(${s.correctCount}, 0), coalesce(${s.answeredCount}, 0), coalesce(${s.totalScore}, 0), coalesce(${s.rwScore}, 0), coalesce(${s.mathScore}, 0))
         ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id
       `);
    }

    for (const a of attempts) {
       await db.execute(sql`
         INSERT INTO attempts (session_id, question_id, is_correct, answer, mode, created_at)
         VALUES (${a.sessionId}, ${a.questionId}, ${a.isCorrect}, ${a.answer}, ${a.mode}, coalesce(${a.createdAt}::timestamp, now()))
         ON CONFLICT (session_id, question_id) DO NOTHING
       `);
       merged++;
    }

    return NextResponse.json({ ok: true, merged });
  } catch (e) {
    console.error("[api/sessions/merge] failed:", e);
    return NextResponse.json({ error: "Failed to merge" }, { status: 500 });
  }
}
