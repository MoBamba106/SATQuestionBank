import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import type { StatsPayload } from "@/lib/types";
import { getRequestUser } from "@/lib/auth/server";

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
        SELECT to_char(a.created_at, 'YYYY-MM-DD') AS date, COUNT(*)::int AS attempts,
               SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::int AS correct
        FROM attempts a
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
        WHERE a.created_at >= now() - interval '14 days'
        GROUP BY 1 ORDER BY 1
      `),
    );

    const days = rows<{ d: string }>(
      await db.execute(sql`
        SELECT DISTINCT to_char(a.created_at, 'YYYY-MM-DD') AS d
        FROM attempts a
        INNER JOIN quiz_sessions qs ON qs.id = a.session_id AND qs.user_id = ${uid}
        ORDER BY d DESC
      `),
    ).map((r) => r.d);
    let current = 0;
    let longest = 0;
    let run = 0;
    const daySet = new Set(days);
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    let cursor = new Date(today);
    if (!daySet.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (daySet.has(fmt(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const sorted = [...daySet].sort();
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) run = 1;
      else {
        const prev = new Date(sorted[i - 1]);
        prev.setDate(prev.getDate() + 1);
        run = fmt(prev) === sorted[i] ? run + 1 : 1;
      }
      longest = Math.max(longest, run);
    }

    const recentSessions = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT id, mode, label, test_id AS "testId", total_questions AS "totalQuestions",
               correct_count AS "correctCount", answered_count AS "answeredCount",
               total_score AS "totalScore", rw_score AS "rwScore", math_score AS "mathScore",
               adaptive_path AS "adaptivePath", skill_bands AS "skillBands",
               started_at AS "startedAt", finished_at AS "finishedAt"
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
