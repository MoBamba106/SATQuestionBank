import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import type { StatsPayload } from "@/lib/types";
import { getRequestUser } from "@/lib/auth/server";
import { detroitDateString, detroitDay, shiftDetroitDate, utcNow } from "@/lib/time";

export const dynamic = "force-dynamic";

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? []) as T[];
}

export async function GET(req: Request) {
  try {
    await ensureSeeded();
    const user = await getRequestUser(req);
    const uid = user.id;

    const totals = rows<{ uniq: number; total: number; correct: number }>(
      await db.execute(sql`
        SELECT COUNT(DISTINCT a.question_id)::int AS uniq, COUNT(*)::int AS total,
               COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::int AS correct
        FROM attempts a
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
      `),
    )[0] ?? { uniq: 0, total: 0, correct: 0 };

    const mistakes = rows<{ c: number }>(
      await db.execute(sql`
        WITH latest AS (
          SELECT DISTINCT ON (a.question_id) a.question_id, a.is_correct
          FROM attempts a
          INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
          ORDER BY a.question_id, a.created_at DESC, a.id DESC
        )
        SELECT COUNT(*)::int AS c FROM latest WHERE is_correct = false
      `),
    )[0] ?? { c: 0 };

    const favCount = rows<{ c: number }>(
      await db.execute(sql`SELECT COUNT(*)::int AS c FROM favorites WHERE user_id = ${uid}`),
    )[0]?.c ?? 0;
    const colCount = rows<{ c: number }>(
      await db.execute(sql`SELECT COUNT(*)::int AS c FROM collections WHERE user_id = ${uid}`),
    )[0]?.c ?? 0;
    const sessCount = rows<{ c: number }>(
      await db.execute(sql`
        SELECT COUNT(*)::int AS c FROM quiz_sessions
        WHERE user_id = ${uid} AND finished_at IS NOT NULL
      `),
    )[0]?.c ?? 0;

    const byDomain = rows<{ domain: string; total: number; correct: number }>(
      await db.execute(sql`
        SELECT q.domain, COUNT(*)::int AS total,
               SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
        FROM attempts a
        JOIN questions q ON q.id = a.question_id
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
        GROUP BY q.domain ORDER BY q.domain
      `),
    );

    const bySkill = rows<{ skill: string; domain: string; total: number; correct: number }>(
      await db.execute(sql`
        SELECT q.skill, q.domain, COUNT(*)::int AS total,
               SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
        FROM attempts a
        JOIN questions q ON q.id = a.question_id
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
        GROUP BY q.skill, q.domain ORDER BY total DESC
      `),
    );

    const byDifficulty = rows<{ difficulty: string; total: number; correct: number }>(
      await db.execute(sql`
        SELECT q.difficulty, COUNT(*)::int AS total,
               SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
        FROM attempts a
        JOIN questions q ON q.id = a.question_id
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
        GROUP BY q.difficulty
        ORDER BY CASE q.difficulty WHEN 'Easy' THEN 0 WHEN 'Medium' THEN 1 WHEN 'Hard' THEN 2 ELSE 3 END
      `),
    );

    const activity = rows<{ date: string; attempts: number; correct: number }>(
      await db.execute(sql`
        SELECT ${detroitDay(sql`a.created_at`)} AS date, COUNT(*)::int AS attempts,
               SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
        FROM attempts a
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
        WHERE a.created_at >= ${utcNow} - interval '14 days'
        GROUP BY 1 ORDER BY 1
      `),
    );

    const days = rows<{ d: string }>(
      await db.execute(sql`
        SELECT DISTINCT ${detroitDay(sql`a.created_at`)} AS d
        FROM attempts a
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
        ORDER BY d DESC
      `),
    ).map((r) => r.d);
    /**
     * Streaks are counted over **Detroit calendar days**. `days` already holds
     * `YYYY-MM-DD` Detroit dates from the query above, so all arithmetic here
     * is pure date-string stepping — no Date/local-zone mixing, and DST-safe
     * (`shiftDetroitDate` anchors at midday UTC).
     */
    const daySet = new Set(days);
    let current = 0;
    let longest = 0;
    let run = 0;

    // A streak stays alive until the end of today in Detroit: if nothing has
    // been practiced yet today, start counting from yesterday.
    let cursor = detroitDateString();
    if (!daySet.has(cursor)) cursor = shiftDetroitDate(cursor, -1);
    while (daySet.has(cursor)) {
      current++;
      cursor = shiftDetroitDate(cursor, -1);
    }

    const sorted = [...daySet].sort();
    for (let i = 0; i < sorted.length; i++) {
      run = i > 0 && shiftDetroitDate(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
      longest = Math.max(longest, run);
    }

    const recentSessions = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT id, mode, label, test_id AS "testId", total_questions AS "totalQuestions",
               correct_count AS "correctCount", answered_count AS "answeredCount",
               total_score AS "totalScore", rw_score AS "rwScore", math_score AS "mathScore",
               adaptive_path AS "adaptivePath", skill_bands AS "skillBands",
               (started_at AT TIME ZONE 'UTC') AS "startedAt", (finished_at AT TIME ZONE 'UTC') AS "finishedAt"
        FROM quiz_sessions
        WHERE user_id = ${uid} AND finished_at IS NOT NULL
        ORDER BY finished_at DESC LIMIT 5
      `),
    ).map((s) => ({ ...s, attempts: [] }));

    const payload: StatsPayload = {
      uniqueQuestions: totals.uniq,
      totalAttempts: totals.total,
      totalCorrect: totals.correct,
      accuracy: totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : 0,
      mistakesCount: mistakes.c,
      favoritesCount: favCount,
      collectionsCount: colCount,
      sessionsCount: sessCount,
      streak: { current, longest },
      byDomain,
      bySkill,
      byDifficulty,
      activity,
      recentSessions: recentSessions as unknown as StatsPayload["recentSessions"],
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[api/stats] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load stats" }, { status: 500 });
  }
}
