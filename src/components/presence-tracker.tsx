"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";
import { readStoredAuth } from "@/lib/auth/client";

/**
 * Heartbeat tracker - POSTs to /api/presence every 30s while user is signed in.
 * Allows admin page to show green dot for online users (last_seen within 2 minutes).
 *
 * Every beat reads the *current* access token from storage. A stale closure
 * token made the server silently treat signed-in users as guests, so their
 * heartbeat was never recorded and "last online" stayed stuck on "Never".
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
    const interval = window.setInterval(() => void beat(), 30_000);

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
