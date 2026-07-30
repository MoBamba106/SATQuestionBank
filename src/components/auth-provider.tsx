"use client";

import * as React from "react";
import type { AuthUser } from "@/lib/auth/types";
import { GUEST_USER } from "@/lib/auth/types";
import {
  clearAuth,
  getCurrentAuthState,
  isAuthEnabled,
  persistAuth,
  signInAnonymously,
  signInWithEmail,
  signOutSupabase,
  signUpWithEmail,
  subscribeToAuthState,
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
  signUp: (email: string, password: string) => Promise<void>;
  signInGuestCloud: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsLocalGuest: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser>(GUEST_USER);
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
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      ready,
      authEnabled,
      isAdmin,
      async signIn(email, password) {
        const session = await signInWithEmail(email, password);
        applySession(session.user, session.accessToken);
      },
      async signUp(email, password) {
        const session = await signUpWithEmail(email, password);
        applySession(session.user, session.accessToken);
      },
      async signInGuestCloud() {
        const session = await signInAnonymously();
        applySession(session.user, session.accessToken);
      },
      async signOut() {
        await signOutSupabase();
        clearAuth();
        setImpersonatedUser(null);
        applySession(GUEST_USER, null);
      },
      continueAsLocalGuest() {
        clearAuth();
        applySession(GUEST_USER, null);
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
