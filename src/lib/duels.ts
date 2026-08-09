/**
 * Shared constants for Quiz Duel stale-session handling.
 *
 * A duel room is considered abandoned when neither player has sent a
 * WebSocket heartbeat or performed any action for `DUEL_STALE_MS`. The
 * server auto-expires such rooms (status → "expired") so they stop
 * appearing in the "Active duels" list.
 */
export const DUEL_STALE_MS = 90_000;

/** Client heartbeat cadence — comfortably inside the 90s staleness window. */
export const DUEL_HEARTBEAT_MS = 30_000;

/** Raw SQL interval literal for "no activity for the staleness window". */
export const DUEL_STALE_INTERVAL_SQL = `interval '${DUEL_STALE_MS / 1000} seconds'`;
