"use client";

import * as React from "react";
import type { AuthUser } from "@/lib/auth/types";
import { GUEST_USER } from "@/lib/auth/types";
import {
  clearAuth,
  isCloudBaseEnabled,
  persistAuth,
  readStoredAuth,
  signInAnonymously,
  signInWithEmail,
  signOutCloudBase,
  signUpWithEmail,
} from "@/lib/auth/client";
import { mutateKey } from "@/lib/api-client";

type AuthContextValue = {
  user: AuthUser;
  accessToken: string | null;
  ready: boolean;
  cloudBaseEnabled: boolean;
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
  const cloudBaseEnabled = isCloudBaseEnabled();

  React.useEffect(() => {
    const stored = readStoredAuth();
    setUser(stored.user);
    setAccessToken(stored.accessToken);
    setReady(true);
  }, []);

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
      cloudBaseEnabled,
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
        await signOutCloudBase();
        clearAuth();
        applySession(GUEST_USER, null);
      },
      continueAsLocalGuest() {
        clearAuth();
        applySession(GUEST_USER, null);
      },
    }),
    [accessToken, applySession, cloudBaseEnabled, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
