import { sql, type SQL } from "drizzle-orm";
import { DETROIT_TIME_ZONE } from "@/lib/utils";

/**
 * Server-side time helpers.
 *
 * Storage principle: every timestamp column in the schema is
 * `timestamp without time zone` holding a **UTC wall clock**. The pg pool pins
 * `timezone=UTC` (see `@/db`), so `now()` always produces UTC.
 *
 * Presentation principle: user-facing calendar dates — "today", daily
 * analytics buckets, streaks, last-active — are computed in
 * **America/Detroit**, the app's home zone. Using the IANA zone name (never a
 * fixed `EST` / `UTC-5` offset) keeps daylight-saving transitions correct.
 */

export { DETROIT_TIME_ZONE };

/** "Now" as a UTC wall clock, matching how timestamps are stored. */
export const utcNow: SQL = sql`timezone('utc', now())`;

/**
 * Reinterpret a stored UTC wall clock as a real instant (timestamptz).
 * Use this whenever a timestamp is sent to the client, so the browser is not
 * left guessing the zone.
 */
export function asUtcInstant(column: SQL): SQL {
  return sql`(${column} AT TIME ZONE 'UTC')`;
}

/**
 * Group a stored timestamp into an **America/Detroit calendar day**
 * (`YYYY-MM-DD`).
 *
 * `col AT TIME ZONE 'UTC'` turns the stored wall clock into a real instant;
 * the second conversion renders that instant in Detroit local time. An attempt
 * made at 9pm Detroit on Aug 9 is 01:00 UTC on Aug 10 — this reports it as
 * `2026-08-09`, which is the day the student actually studied. Grouping on the
 * raw UTC value is what made analytics show "tomorrow" late in the evening.
 */
export function detroitDay(column: SQL): SQL {
  return sql`to_char((${column} AT TIME ZONE 'UTC') AT TIME ZONE ${sql.raw(`'${DETROIT_TIME_ZONE}'`)}, 'YYYY-MM-DD')`;
}

/** Today's date in Detroit as `YYYY-MM-DD`, computed in the database. */
export const detroitToday: SQL = sql`to_char(timezone(${sql.raw(`'${DETROIT_TIME_ZONE}'`)}, now()), 'YYYY-MM-DD')`;

/**
 * Today's date in Detroit as `YYYY-MM-DD`, computed in Node.
 * Mirrors `detroitToday` for code paths that are already in JS.
 */
export function detroitDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DETROIT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Step a `YYYY-MM-DD` Detroit date string back by `days` calendar days. */
export function shiftDetroitDate(date: string, days: number): string {
  // Anchor at midday UTC so ±1 day arithmetic can never cross a DST edge.
  const anchor = new Date(`${date}T12:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}
