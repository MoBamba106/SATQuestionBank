import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { uid } from "@/lib/utils";
import { getRequestUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

/**
 * List the current user's completed practice-test sessions for the "Past Tests"
 * experience. Each row carries everything the review page needs to reconstruct
 * the test: the test id (to load module questions + order), the adaptive route,
 * scores, and the completion time.
 */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const res = await db.execute(sql`
      SELECT s.id, s.mode, s.label, s.test_id AS "testId",
             t.title AS "testTitle", t.test_number AS "testNumber",
             t.is_custom AS "isCustom",
             s.total_questions AS "totalQuestions",
             s.correct_count AS "correctCount",
             s.answered_count AS "answeredCount",
             s.adaptive_path AS "adaptivePath",
             s.total_score AS "totalScore",
             s.rw_score AS "rwScore",
             s.math_score AS "mathScore",
             s.skill_bands AS "skillBands",
             s.started_at AS "startedAt",
             s.finished_at AS "finishedAt"
      FROM quiz_sessions s
      LEFT JOIN practice_tests t ON t.id = s.test_id
      WHERE s.user_id = ${user.id}
        AND s.mode = 'bluebook'
        AND s.finished_at IS NOT NULL
      ORDER BY s.finished_at DESC
      LIMIT 200
    `);
    return NextResponse.json({ sessions: (res as unknown as { rows: unknown[] }).rows ?? [] });
  } catch (e) {
    console.error("[api/sessions] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load past tests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const body = await req.json();
    const id = uid("quiz");
    const mode = String(body?.mode ?? "practice");
    const label = body?.label ? String(body.label) : null;
    const testId = body?.testId ? String(body.testId) : null;
    const totalQuestions = Math.max(0, Number(body?.totalQuestions ?? 0) || 0);
    await db.execute(sql`
      INSERT INTO quiz_sessions (id, user_id, mode, label, test_id, total_questions)
      VALUES (${id}, ${user.id}, ${mode}, ${label}, ${testId}, ${totalQuestions})
    `);
    return NextResponse.json({ id, mode, label, testId, totalQuestions, userId: user.id });
  } catch (e) {
    console.error("[api/sessions] POST failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to start session" }, { status: 500 });
  }
}
