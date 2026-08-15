import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { isLocalGuestId } from "@/lib/auth/types";

/**
 * Presence ("last active") recording.
 *
 * Historically the only writer was `POST /api/presence`, a 30s client
 * heartbeat. That made "last active" unreliable in three ways:
 *
 *  1. The heartbeat needs a *verifiable* Supabase access token. Whenever the
 *     token was expired, Supabase was unconfigured, or the tab never stayed
 *     open long enough, nothing was written — so a user who had clearly used
 *     the site still had no `user_presence` row and the admin console showed
 *     "Never active".
 *  2. Accounts that predate the presence feature never got a row at all.
 *  3. Real activity (finishing quizzes, grading answers, saving notes) did not
 *     count as presence, even though it is the strongest possible evidence
 *     that someone was using the app.
 *
 * The fix is to treat *any authenticated API request* as presence, which is
 * what the user is actually doing, and to throttle the write so we do not add
 * a database round-trip to every request.
 */

/** Minimum gap between presence writes for one user (ms). */
const PRESENCE_THROTTLE_MS = 60_000;

type PresenceCache = Map<string, number>;

const globalForPresence = globalThis as typeof globalThis & {
  __satNexusPresenceCache?: PresenceCache;
};

function cache(): PresenceCache {
  globalForPresence.__satNexusPresenceCache ??= new Map();
  return globalForPresence.__satNexusPresenceCache;
}

/**
 * Record that `userId` is active right now.
 *
 * - No-ops for guests (they have no stable account to report on).
 * - Throttled per user so a burst of API calls performs at most one write per
 *   minute. Presence only needs minute-level resolution — the admin console
 *   treats "seen in the last 2 minutes" as online.
 * - Never throws: presence is telemetry and must not break a real request.
 *
 * Timestamps are written with `timezone('utc', now())` so the value stored in
 * the `timestamp without time zone` column is always a UTC wall clock,
 * independent of the database session's TimeZone setting. Presentation
 * converts to America/Detroit (see `formatDetroit*` in `@/lib/utils`).
 */
export async function touchPresence(userId: string | null | undefined): Promise<void> {
  if (!userId || isLocalGuestId(userId)) return;

  const now = Date.now();
  const last = cache().get(userId) ?? 0;
  if (now - last < PRESENCE_THROTTLE_MS) return;
  cache().set(userId, now);

  try {
    await db.execute(sql`
      INSERT INTO user_presence (user_id, last_seen, updated_at)
      VALUES (${userId}, timezone('utc', now()), timezone('utc', now()))
      ON CONFLICT (user_id) DO UPDATE SET
        last_seen = timezone('utc', now()),
        updated_at = timezone('utc', now())
    `);
  } catch (error) {
    // A failed presence write must never surface to the user. Drop the
    // throttle marker so the next request retries.
    cache().delete(userId);
    console.warn(
      "[presence] could not record activity:",
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * SQL expression for a user's true "last active" instant, as a UTC timestamptz.
 *
 * Presence heartbeats are preferred, but we fall back to the newest real
 * activity the account has produced. This is what stops long-standing users
 * from being reported as "Never active" just because they have no heartbeat
 * row: answering a question, finishing a session, writing a note, favouriting,
 * creating a collection or filing feedback all count.
 *
 * Requires `users u` in scope; safe inside an aggregate query because every
 * branch is a scalar subquery.
 */
export const lastActiveExpr = sql`
  GREATEST(
    (SELECT up.last_seen FROM user_presence up WHERE up.user_id = u.id),
    (SELECT MAX(a.created_at) FROM attempts a
       JOIN quiz_sessions s ON s.id = a.session_id WHERE s.user_id = u.id),
    (SELECT MAX(GREATEST(s.started_at, COALESCE(s.finished_at, s.started_at)))
       FROM quiz_sessions s WHERE s.user_id = u.id),
    (SELECT MAX(n.updated_at) FROM notes n WHERE n.user_id = u.id),
    (SELECT MAX(f.created_at) FROM favorites f WHERE f.user_id = u.id),
    (SELECT MAX(c.updated_at) FROM collections c WHERE c.user_id = u.id),
    (SELECT MAX(fb.created_at) FROM feedback fb WHERE fb.user_id = u.id)
  )
`;
