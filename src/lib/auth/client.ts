"use client";

import type { AuthUser } from "@/lib/auth/types";
import { GUEST_USER } from "@/lib/auth/types";

const TOKEN_KEY = "sat_nexus_access_token";
const USER_KEY = "sat_nexus_auth_user";

export type ClientAuthState = {
  user: AuthUser;
  accessToken: string | null;
  ready: boolean;
};

export function readStoredAuth(): { user: AuthUser; accessToken: string | null } {
  if (typeof window === "undefined") return { user: GUEST_USER, accessToken: null };
  try {
    const accessToken = window.localStorage.getItem(TOKEN_KEY);
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return { user: GUEST_USER, accessToken };
    const user = JSON.parse(raw) as AuthUser;
    if (!user?.id) return { user: GUEST_USER, accessToken };
    return { user: { ...user, isGuest: Boolean(user.isGuest) }, accessToken };
  } catch {
    return { user: GUEST_USER, accessToken: null };
  }
}

export function persistAuth(user: AuthUser, accessToken: string | null) {
  if (typeof window === "undefined") return;
  if (accessToken) window.localStorage.setItem(TOKEN_KEY, accessToken);
  else window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (accessToken) {
    document.cookie = `sat_nexus_access_token=${encodeURIComponent(accessToken)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  } else {
    document.cookie = "sat_nexus_access_token=; path=/; max-age=0; samesite=lax";
  }
}

export function clearAuth() {
  persistAuth(GUEST_USER, null);
}

export function cloudbaseEnvId() {
  return process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID?.trim() || "";
}

export function isCloudBaseEnabled() {
  return Boolean(cloudbaseEnvId());
}

type LooseAuth = {
  signInWithEmailAndPassword?: (email: string, password: string) => Promise<unknown>;
  signInWithPassword?: (opts: { username: string; password: string }) => Promise<unknown>;
  signUpWithEmailAndPassword?: (email: string, password: string) => Promise<unknown>;
  signUp?: (opts: { email: string; password: string }) => Promise<unknown>;
  signInAnonymously?: () => Promise<unknown>;
  anonymousAuthProvider?: () => { signIn?: () => Promise<unknown> };
  signOut: () => Promise<unknown>;
  getLoginState?: () => Promise<unknown>;
  currentUser?: unknown;
};

export async function getCloudBaseApp() {
  const env = cloudbaseEnvId();
  if (!env) throw new Error("CloudBase is not configured (NEXT_PUBLIC_CLOUDBASE_ENV_ID).");
  const cloudbase = (await import("@cloudbase/js-sdk")).default as {
    init: (opts: { env: string }) => { auth: (opts?: { persistence?: string }) => LooseAuth };
  };
  return cloudbase.init({ env });
}

export async function signInWithEmail(email: string, password: string) {
  const app = await getCloudBaseApp();
  const auth = app.auth({ persistence: "local" });
  const result =
    (await auth.signInWithEmailAndPassword?.(email, password)) ??
    (await auth.signInWithPassword?.({ username: email, password }));
  return normalizeSession(auth, result);
}

export async function signUpWithEmail(email: string, password: string) {
  const app = await getCloudBaseApp();
  const auth = app.auth({ persistence: "local" });
  const result =
    (await auth.signUpWithEmailAndPassword?.(email, password)) ??
    (await auth.signUp?.({ email, password }));
  return normalizeSession(auth, result);
}

export async function signInAnonymously() {
  const app = await getCloudBaseApp();
  const auth = app.auth({ persistence: "local" });
  if (auth.signInAnonymously) await auth.signInAnonymously();
  else await auth.anonymousAuthProvider?.().signIn?.();
  return normalizeSession(auth, null);
}

export async function signOutCloudBase() {
  try {
    const app = await getCloudBaseApp();
    await app.auth().signOut();
  } catch {
    /* ignore when CloudBase is disabled */
  }
  clearAuth();
}

async function normalizeSession(auth: LooseAuth, result: unknown) {
  const state = ((await auth.getLoginState?.()) ?? auth.currentUser ?? result) as Record<string, unknown> | null;
  const userInfo = ((state?.user ?? state?.userInfo ?? state) ?? {}) as Record<string, unknown>;
  const uid = userInfo.uid || userInfo.openId || state?.uid;
  if (!uid) throw new Error("Sign-in succeeded but no user id was returned.");
  const credential = (state?.credential ?? {}) as Record<string, unknown>;
  const accessToken = (credential.accessToken || state?.accessToken || null) as string | null;
  const user: AuthUser = {
    id: String(uid),
    email: (userInfo.email as string) ?? null,
    displayName: (userInfo.nickName as string) || (userInfo.email as string) || "Student",
    avatarUrl: (userInfo.avatarUrl as string) ?? null,
    isGuest: false,
  };
  persistAuth(user, accessToken);
  return { user, accessToken };
}

export function authHeaders(accessToken: string | null | undefined): HeadersInit {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}
