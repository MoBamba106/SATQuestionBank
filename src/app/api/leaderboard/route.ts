import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeeded } from "@/lib/seed";
import { GUEST_USER_ID } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

export type LeaderboardEntry = {
  userId: string;
  name: string;
  value: number;
  detail: string;
};

function rows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? []) as T[];
}

function displayName(name: string | null, email: string | null, id: string): string {
  if (name && name.trim() && name.trim().toLowerCase() !== "student") return name.trim();
  if (email) return email.split("@")[0];
  return `Student ${id.slice(0, 6)}`;
}

/**
 * Public leaderboards across signed-up accounts.
 * Guests and users who opted out (hide_leaderboard) are excluded.
 */
export async function GET() {
  try {
    await ensureSeeded();

    const base = sql`
      SELECT u.id, u.display_name AS name, u.email,
             COUNT(a.id)::int AS attempts,
             COALESCE(SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::int AS correct,
             COALESCE(SUM(CASE WHEN q.domain = 'Math' THEN 1 ELSE 0 END), 0)::int AS math_attempts,
             COALESCE(SUM(CASE WHEN q.domain = 'Math' AND a.is_correct THEN 1 ELSE 0 END), 0)::int AS math_correct,
             COALESCE(SUM(CASE WHEN q.domain <> 'Math' THEN 1 ELSE 0 END), 0)::int AS rw_attempts,
             COALESCE(SUM(CASE WHEN q.domain <> 'Math' AND a.is_correct THEN 1 ELSE 0 END), 0)::int AS rw_correct
      FROM users u
      JOIN quiz_sessions qs ON qs.user_id = u.id
      JOIN attempts a ON a.session_id = qs.id
      JOIN questions q ON q.id = a.question_id
      WHERE u.id <> ${GUEST_USER_ID} AND u.hide_leaderboard = false
      GROUP BY u.id
    `;

    const stats = rows<{
      id: string; name: string | null; email: string | null;
      attempts: number; correct: number;
      math_attempts: number; math_correct: number;
      rw_attempts: number; rw_correct: number;
    }>(await db.execute(base));

    const named = stats.map((s) => ({ ...s, label: displayName(s.name, s.email, s.id) }));
    const top = <T,>(list: T[], n = 10) => list.slice(0, n);

    const mostQuestions: LeaderboardEntry[] = top(
      [...named].sort((a, b) => b.attempts - a.attempts).map((s) => ({
        userId: s.id, name: s.label, value: s.attempts, detail: `${s.correct} correct`,
      })),
    );
    const mostAccurate: LeaderboardEntry[] = top(
      [...named]
        .filter((s) => s.attempts >= 20)
        .sort((a, b) => b.correct / b.attempts - a.correct / a.attempts || b.attempts - a.attempts)
        .map((s) => ({
          userId: s.id, name: s.label,
          value: Math.round((s.correct / s.attempts) * 100),
          detail: `${s.correct}/${s.attempts} over 20+ questions`,
        })),
    );
    const mostMath: LeaderboardEntry[] = top(
      [...named]
        .filter((s) => s.math_attempts > 0)
        .sort((a, b) => b.math_attempts - a.math_attempts)
        .map((s) => ({
          userId: s.id, name: s.label, value: s.math_attempts, detail: `${s.math_correct} correct`,
        })),
    );
    const mostEnglish: LeaderboardEntry[] = top(
      [...named]
        .filter((s) => s.rw_attempts > 0)
        .sort((a, b) => b.rw_attempts - a.rw_attempts)
        .map((s) => ({
          userId: s.id, name: s.label, value: s.rw_attempts, detail: `${s.rw_correct} correct`,
        })),
    );

    return NextResponse.json({
      boards: {
        mostQuestions,
        mostAccurate,
        mostMath,
        mostEnglish,
      },
      totalRankedUsers: named.length,
    });
  } catch (e) {
    console.error("[api/leaderboard] GET failed:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load leaderboard" }, { status: 500 });
  }
}
