"use client";

import * as React from "react";
import { useAuth } from "@/components/auth-provider";

/**
 * Heartbeat tracker - POSTs to /api/presence every 30s while user is signed in.
 * Allows admin page to show green dot for online users (last_seen within 2 minutes).
 */
export function PresenceTracker() {
  const auth = useAuth();

  React.useEffect(() => {
    if (auth.user.isGuest || !auth.accessToken) return;

    let active = true;

    const beat = async () => {
      if (!active) return;
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.accessToken}`,
          },
        });
      } catch {
        // ignore network errors
      }
    };

    // immediate beat
    void beat();
    const interval = window.setInterval(beat, 30_000);

    // also beat on visibility change
    const onVisible = () => {
      if (document.visibilityState === "visible") void beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [auth.user.isGuest, auth.accessToken, auth.user.id]);

  return null;
}
