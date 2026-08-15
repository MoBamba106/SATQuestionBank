"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { readStoredAuth } from "@/lib/auth/client";

/**
 * Heartbeat tracker — POSTs to /api/presence while the user is signed in, so
 * the admin console can show a green dot for users online in the last 2 min.
 *
 * Every beat reads the *current* access token from storage. A stale closure
 * token made the server silently treat signed-in users as guests, so their
 * heartbeat was never recorded and "last online" stayed stuck on "Never".
 *
 * The heartbeat is now a *supplement*, not the source of truth: the server
 * records presence on every authenticated API request (throttled to one write
 * per user per minute — see `@/lib/presence`). This beat exists only to keep
 * an idle-but-open tab marked online, so it runs on a relaxed 60s interval
 * and skips hidden tabs.
 */
export function PresenceTracker() {
  const auth = useAuth();

  React.useEffect(() => {
    if (!auth.ready || auth.user.isGuest) return;

    let active = true;

    const beat = async () => {
      if (!active) return;
      // Skip beats from hidden tabs; they aren't "online" activity.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const { accessToken } = readStoredAuth();
        if (!accessToken) return;
        await fetch("/api/presence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch {
        // ignore network errors — the next interval will retry
      }
    };

    // immediate beat
    void beat();
    const interval = window.setInterval(() => void beat(), 60_000);

    // also beat when the tab becomes visible / regains focus / reconnects
    const onVisible = () => {
      if (document.visibilityState === "visible") void beat();
    };
    const onFocus = () => void beat();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [auth.ready, auth.user.isGuest, auth.user.id]);

  return null;
}
