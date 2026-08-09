import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { requireAdmin, AdminAuthError } from "@/lib/auth/server";
import { GUEST_USER_ID } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? []) as T[];
}

/** Admin console data: every account plus combined analytics. */
export async function GET(req: Request) {
  try {
    await ensureSeeded();
    await requireAdmin(req);

    const users = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT u.id, u.email, u.display_name AS "displayName",
               u.hide_leaderboard AS "hideLeaderboard",
               (u.created_at AT TIME ZONE 'UTC') AS "createdAt",
               COUNT(a.id)::int AS attempts,
               COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::int AS correct,
               COUNT(DISTINCT qs.id) FILTER (WHERE qs.finished_at IS NOT NULL)::int AS sessions,
               (MAX(a.created_at) AT TIME ZONE 'UTC') AS "lastActive",
               (up.last_seen AT TIME ZONE 'UTC') AS "lastSeen",
               CASE WHEN up.last_seen >= now() - interval '2 minutes' THEN true ELSE false END AS "isOnline"
        FROM users u
        LEFT JOIN quiz_sessions qs ON qs.user_id = u.id
        LEFT JOIN attempts a ON a.session_id = qs.id
        LEFT JOIN user_presence up ON up.user_id = u.id
        WHERE u.id <> ${GUEST_USER_ID} AND u.id NOT LIKE 'guest_%'
        GROUP BY u.id, up.last_seen
        ORDER BY up.last_seen DESC NULLS LAST, MAX(a.created_at) DESC NULLS LAST, u.created_at DESC
        LIMIT 500
      `),
    );

    const totals = rows<{ users: number; attempts: number; correct: number; sessions: number }>(
      await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM users WHERE id <> ${GUEST_USER_ID} AND id NOT LIKE 'guest_%') AS users,
          (SELECT COUNT(*)::int FROM attempts) AS attempts,
          (SELECT COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)::int FROM attempts) AS correct,
          (SELECT COUNT(*)::int FROM quiz_sessions WHERE finished_at IS NOT NULL) AS sessions
      `),
    )[0] ?? { users: 0, attempts: 0, correct: 0, sessions: 0 };

    const byDomain = rows<{ domain: string; total: number; correct: number }>(
      await db.execute(sql`
        SELECT q.domain, COUNT(*)::int AS total,
               COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::int AS correct
        FROM attempts a JOIN questions q ON q.id = a.question_id
        GROUP BY q.domain ORDER BY q.domain
      `),
    );

    const activity = rows<{ date: string; attempts: number; correct: number }>(
      await db.execute(sql`
        SELECT to_char(created_at AT TIME ZONE 'America/Detroit', 'YYYY-MM-DD') AS date,
               COUNT(*)::int AS attempts,
               COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0)::int AS correct
        FROM attempts
        WHERE created_at >= now() - interval '30 days'
        GROUP BY 1 ORDER BY 1
      `),
    );

    const feedbackCounts = rows<{ status: string; c: number }>(
      await db.execute(sql`SELECT status, COUNT(*)::int AS c FROM feedback GROUP BY status`),
    );

    return NextResponse.json({ users, totals, byDomain, activity, feedbackCounts });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: 403 });
    console.error("[api/admin/overview] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load admin data" }, { status: 500 });
  }
}
