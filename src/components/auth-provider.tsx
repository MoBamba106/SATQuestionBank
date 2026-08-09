"use client";

import * as React from "react";
import type { AuthUser } from "@/lib/auth/types";
import { isLocalGuestId, makeLocalGuestUser } from "@/lib/auth/types";
import {
  clearAuth,
  clearLocalGuestProgressKeys,
  getCurrentAuthState,
  getLocalGuestUser,
  getOrCreateLocalGuestId,
  isAuthEnabled,
  persistAuth,
  signInAnonymously,
  signInWithEmail,
  signOutSupabase,
  signUpWithEmail,
  subscribeToAuthState,
  updateSupabaseDisplayName,
} from "@/lib/auth/client";
import { mutateKey, setImpersonatedUser } from "@/lib/api-client";

type AuthContextValue = {
  user: AuthUser;
  accessToken: string | null;
  ready: boolean;
  authEnabled: boolean;
  /** Server-verified admin status for the signed-in account. */
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInPasskey: (email?: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  signInGuestCloud: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsLocalGuest: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

async function migrateGuestProgress(guestId: string | null, accessToken: string | null) {
  if (!guestId || !accessToken || !isLocalGuestId(guestId) || guestId === "guest") return;
  try {
    await fetch("/api/auth/migrate-guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ guestId }),
    });
  } catch {
    /* best-effort — account still works without the import */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser>(() => makeLocalGuestUser());
  const [accessToken, setAccessToken] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const authEnabled = isAuthEnabled();

  // Ask the server whether the signed-in account is an admin (ADMIN_EMAILS).
  React.useEffect(() => {
    let active = true;
    if (!accessToken || user.isGuest) {
      const timer = window.setTimeout(() => {
        if (active) setIsAdmin(false);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) setIsAdmin(Boolean(data?.user?.isAdmin));
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, user.isGuest, user.id]);

  React.useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const timer = window.setTimeout(async () => {
      getOrCreateLocalGuestId();
      const stored = await getCurrentAuthState();
      if (!active) return;
      setUser(stored.user);
      setAccessToken(stored.accessToken);
      setReady(true);

      if (authEnabled) {
        unsubscribe = subscribeToAuthState((next) => {
          if (!active) return;
          setUser(next.user);
          setAccessToken(next.accessToken);
          mutateKey("favorites");
          mutateKey("collections");
          mutateKey("stats");
          mutateKey("mistakes");
        });
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
      unsubscribe?.();
    };
  }, [authEnabled]);

  const applySession = React.useCallback((next: AuthUser, token: string | null) => {
    setUser(next);
    setAccessToken(token);
    persistAuth(next, token);
    mutateKey("favorites");
    mutateKey("collections");
    mutateKey("stats");
    mutateKey("mistakes");
    mutateKey("leaderboard");
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      ready,
      authEnabled,
      isAdmin,
      async signIn(email, password) {
        const priorGuestId = user.isGuest ? user.id : getOrCreateLocalGuestId();
        const session = await signInWithEmail(email, password);
        // Existing account: discard temporary guest progress so it can't pollute.
        clearLocalGuestProgressKeys();
        // Still try to import any server-side guest rows that belong to this browser.
        await migrateGuestProgress(priorGuestId, session.accessToken);
        applySession(session.user, session.accessToken);
      },
      async signInPasskey(email) {
        throw new Error("Passkey authentication is disabled.");
      },
      async signUp(email, password, username) {
        const priorGuestId = user.isGuest ? user.id : getOrCreateLocalGuestId();
        const session = await signUpWithEmail(email, password, username);
        // New account: import this browser's guest history, then clear local guest caches.
        await migrateGuestProgress(priorGuestId, session.accessToken);
        clearLocalGuestProgressKeys();
        applySession(session.user, session.accessToken);
      },
      async updateUsername(username) {
        if (user.isGuest) throw new Error("Sign in to edit your username.");
        const trimmed = username.trim();
        if (trimmed.length < 3) throw new Error("Username must be at least 3 characters.");
        const nextUser = authEnabled ? await updateSupabaseDisplayName(trimmed) : { ...user, displayName: trimmed };
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ displayName: trimmed }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Could not update username");
        }
        applySession({ ...nextUser, id: user.id, email: user.email, displayName: trimmed, isGuest: false }, accessToken);
      },
      async signInGuestCloud() {
        const session = await signInAnonymously();
        applySession(session.user, session.accessToken);
      },
      async signOut() {
        await signOutSupabase();
        clearAuth();
        setImpersonatedUser(null);
        applySession(getLocalGuestUser(), null);
      },
      continueAsLocalGuest() {
        clearAuth();
        applySession(getLocalGuestUser(), null);
      },
    }),
    [accessToken, applySession, authEnabled, isAdmin, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
