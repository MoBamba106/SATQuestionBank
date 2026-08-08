"use client";

import type { Session, User } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/auth/types";
import { isLocalGuestId, makeLocalGuestUser } from "@/lib/auth/types";
import { getSupabaseBrowserClient, resolveSupabaseAnonKey, resolveSupabaseUrl } from "@/lib/supabase";

const TOKEN_KEY = "sat_nexus_access_token";
const USER_KEY = "sat_nexus_auth_user";
const LOCAL_GUEST_ID_KEY = "sat_nexus_local_guest_id";
const GUEST_ID_HEADER = "x-sat-guest-id";

export type ClientAuthState = {
  user: AuthUser;
  accessToken: string | null;
  ready: boolean;
};

/** Stable per-browser guest id (localStorage). Never shares the global "guest" row. */
export function getOrCreateLocalGuestId(): string {
  if (typeof window === "undefined") return makeLocalGuestUser().id;
  try {
    const existing = window.localStorage.getItem(LOCAL_GUEST_ID_KEY);
    if (existing && isLocalGuestId(existing) && existing !== "guest") return existing;
    const next = makeLocalGuestUser().id;
    window.localStorage.setItem(LOCAL_GUEST_ID_KEY, next);
    return next;
  } catch {
    return makeLocalGuestUser().id;
  }
}

export function getLocalGuestUser(): AuthUser {
  return makeLocalGuestUser(getOrCreateLocalGuestId());
}

export function guestIdHeader(): HeadersInit {
  if (typeof window === "undefined") return {};
  try {
    const id = window.localStorage.getItem(LOCAL_GUEST_ID_KEY);
    if (id && isLocalGuestId(id) && id !== "guest") return { [GUEST_ID_HEADER]: id };
  } catch {
    /* ignore */
  }
  return {};
}

function userFromSupabase(user: User | null | undefined): AuthUser {
  if (!user) return getLocalGuestUser();

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      (typeof metadata.display_name === "string" && metadata.display_name) ||
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      user.email ||
      "Student",
    avatarUrl:
      (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
      (typeof metadata.picture === "string" && metadata.picture) ||
      null,
    isGuest: Boolean((user as User & { is_anonymous?: boolean }).is_anonymous),
  };
}

function persistSessionState(session: Session | null) {
  if (typeof window === "undefined") return;

  if (!session?.user || !session.access_token) {
    window.localStorage.removeItem(TOKEN_KEY);
    const guest = getLocalGuestUser();
    window.localStorage.setItem(USER_KEY, JSON.stringify(guest));
    document.cookie = "sat_nexus_access_token=; path=/; max-age=0; samesite=lax";
    document.cookie = `sat_nexus_guest_id=${encodeURIComponent(guest.id)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    return;
  }

  const user = userFromSupabase(session.user);
  window.localStorage.setItem(TOKEN_KEY, session.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `sat_nexus_access_token=${encodeURIComponent(session.access_token)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  // Drop guest cookie while signed in so APIs don't prefer a stale guest id.
  document.cookie = "sat_nexus_guest_id=; path=/; max-age=0; samesite=lax";
}

export function readStoredAuth(): { user: AuthUser; accessToken: string | null } {
  if (typeof window === "undefined") return { user: getLocalGuestUser(), accessToken: null };
  try {
    const accessToken = window.localStorage.getItem(TOKEN_KEY);
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) {
      const guest = getLocalGuestUser();
      return { user: guest, accessToken };
    }
    const user = JSON.parse(raw) as AuthUser;
    if (!user?.id) return { user: getLocalGuestUser(), accessToken };
    // Migrate legacy shared "guest" id to a unique local guest.
    if (user.isGuest && (user.id === "guest" || !isLocalGuestId(user.id))) {
      const guest = getLocalGuestUser();
      window.localStorage.setItem(USER_KEY, JSON.stringify(guest));
      return { user: guest, accessToken: null };
    }
    return { user: { ...user, isGuest: Boolean(user.isGuest) }, accessToken };
  } catch {
    return { user: getLocalGuestUser(), accessToken: null };
  }
}

export function persistAuth(user: AuthUser, accessToken: string | null) {
  if (typeof window === "undefined") return;
  if (accessToken) window.localStorage.setItem(TOKEN_KEY, accessToken);
  else window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (accessToken) {
    document.cookie = `sat_nexus_access_token=${encodeURIComponent(accessToken)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    document.cookie = "sat_nexus_guest_id=; path=/; max-age=0; samesite=lax";
  } else {
    document.cookie = "sat_nexus_access_token=; path=/; max-age=0; samesite=lax";
    if (user.isGuest && isLocalGuestId(user.id) && user.id !== "guest") {
      try {
        window.localStorage.setItem(LOCAL_GUEST_ID_KEY, user.id);
      } catch {
        /* ignore */
      }
      document.cookie = `sat_nexus_guest_id=${encodeURIComponent(user.id)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }
  }
}

/** Wipe signed-in session and mint/restore this browser's local guest identity. */
export function clearAuth() {
  persistAuth(getLocalGuestUser(), null);
}

/** Drop local guest progress keys after migrating into a real account (or signing into one). */
export function clearLocalGuestProgressKeys() {
  if (typeof window === "undefined") return;
  try {
    // Keep LOCAL_GUEST_ID_KEY so a later sign-out reuses the same browser guest shell,
    // but clear quiz pool / bluebook caches that belonged to guest practice.
    window.sessionStorage.removeItem("sat-quiz-pool");
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (/^sat-bluebook|^sat-nexus-seen-shares:guest/i.test(k) || k.startsWith("sat-guest-"))) {
        keys.push(k);
      }
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function isAuthEnabled() {
  return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey());
}

export async function getCurrentAuthState(): Promise<{ user: AuthUser; accessToken: string | null }> {
  getOrCreateLocalGuestId();
  if (!isAuthEnabled()) return readStoredAuth();

  try {
    const {
      data: { session },
      error,
    } = await getSupabaseBrowserClient().auth.getSession();
    if (error) throw error;
    persistSessionState(session);
    return session?.user
      ? { user: userFromSupabase(session.user), accessToken: session.access_token }
      : { user: getLocalGuestUser(), accessToken: null };
  } catch {
    return readStoredAuth();
  }
}

export function subscribeToAuthState(
  callback: (state: { user: AuthUser; accessToken: string | null }) => void,
) {
  const {
    data: { subscription },
  } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
    persistSessionState(session);
    callback(
      session?.user
        ? { user: userFromSupabase(session.user), accessToken: session.access_token }
        : { user: getLocalGuestUser(), accessToken: null },
    );
  });

  return () => subscription.unsubscribe();
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session || !data.user) throw new Error("Sign-in succeeded but no session was returned.");
  persistSessionState(data.session);
  return { user: userFromSupabase(data.user), accessToken: data.session.access_token };
}

/**
 * WebAuthn / passkey sign-in via Supabase Auth.
 * Requires Passkeys enabled under Supabase → Authentication → Providers.
 * Uses the browser's PublicKeyCredential API (Face ID, Touch ID, Windows Hello).
 */
export async function signInWithPasskey(email?: string) {
  if (!isAuthEnabled()) throw new Error("Supabase Auth is not configured.");
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("This browser doesn't support passkeys.");
  }
  const client = getSupabaseBrowserClient();
  // Supabase JS exposes experimental WebAuthn helpers when passkeys are enabled.
  const auth = client.auth as typeof client.auth & {
    signInWithWebAuthn?: (args?: { email?: string }) => Promise<{
      data: { session: Session | null; user: User | null };
      error: Error | null;
    }>;
    signInWithOtp?: (args: { email: string; options?: Record<string, unknown> }) => Promise<{
      data: { session: Session | null; user: User | null };
      error: Error | null;
    }>;
  };

  if (typeof auth.signInWithWebAuthn === "function") {
    const { data, error } = await auth.signInWithWebAuthn(email?.trim() ? { email: email.trim() } : undefined);
    if (error) throw error;
    if (!data.session || !data.user) throw new Error("Passkey sign-in did not return a session.");
    persistSessionState(data.session);
    return { user: userFromSupabase(data.user), accessToken: data.session.access_token };
  }

  // Fallback path used by some Supabase versions: start a WebAuthn ceremony through the GoTrue REST API.
  const url = resolveSupabaseUrl().replace(/\/$/, "");
  const key = resolveSupabaseAnonKey();
  if (!url || !key) throw new Error("Supabase Auth is not configured.");

  const startRes = await fetch(`${url}/auth/v1/webauthn/authenticate`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(email?.trim() ? { email: email.trim() } : {}),
  });
  if (!startRes.ok) {
    const detail = await startRes.text().catch(() => "");
    throw new Error(
      detail.includes("not enabled") || startRes.status === 404
        ? "Passkeys are not enabled on this Supabase project yet. Enable them under Authentication → Providers → Passkeys (WebAuthn)."
        : `Passkey start failed (${startRes.status}).`,
    );
  }
  throw new Error(
    "Passkey ceremony requires the latest Supabase JS WebAuthn helpers. Enable Passkeys in Supabase and upgrade @supabase/supabase-js, or use email/password for now.",
  );
}

export async function registerPasskey() {
  if (!isAuthEnabled()) throw new Error("Supabase Auth is not configured.");
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("This browser doesn't support passkeys.");
  }
  const client = getSupabaseBrowserClient();
  const auth = client.auth as typeof client.auth & {
    enrollWebAuthn?: () => Promise<{ data: unknown; error: Error | null }>;
    mfa?: {
      enroll?: (args: { factorType: string }) => Promise<{ data: unknown; error: Error | null }>;
    };
  };
  if (typeof auth.enrollWebAuthn === "function") {
    const { error } = await auth.enrollWebAuthn();
    if (error) throw error;
    return;
  }
  throw new Error(
    "Passkey registration needs Supabase Passkeys (WebAuthn) enabled. Turn it on in the Supabase dashboard under Authentication → Providers.",
  );
}

export async function signUpWithEmail(email: string, password: string, username?: string) {
  const displayName = username?.trim() || email.split("@")[0] || "Student";
  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });
  if (error) throw error;
  if (!data.session || !data.user) {
    throw new Error(
      "Account created, but email confirmation is required before you can sign in. Check your inbox or disable email confirmation in Supabase Auth settings.",
    );
  }
  persistSessionState(data.session);
  return { user: userFromSupabase(data.user), accessToken: data.session.access_token };
}

export async function updateSupabaseDisplayName(displayName: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.updateUser({
    data: { display_name: displayName.trim() },
  });
  if (error) throw error;
  return userFromSupabase(data.user);
}

export async function signInAnonymously() {
  const client = getSupabaseBrowserClient();
  const auth = client.auth as typeof client.auth & {
    signInAnonymously?: () => Promise<{ data: { session: Session | null; user: User | null }; error: Error | null }>;
  };
  if (!auth.signInAnonymously) {
    throw new Error("Anonymous Supabase auth is not enabled for this project.");
  }
  const { data, error } = await auth.signInAnonymously();
  if (error) throw error;
  if (!data.session || !data.user) throw new Error("Anonymous sign-in succeeded but no session was returned.");
  persistSessionState(data.session);
  return { user: userFromSupabase(data.user), accessToken: data.session.access_token };
}

export async function signOutSupabase() {
  if (!isAuthEnabled()) {
    clearAuth();
    return;
  }
  const { error } = await getSupabaseBrowserClient().auth.signOut();
  if (error) throw error;
  clearAuth();
}

/**
 * Request a password-reset email. Prefer the app API (Resend) when configured;
 * otherwise fall back to Supabase Auth's built-in recovery mailer.
 */
export async function requestPasswordReset(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  // App route can send a branded Resend email and still uses Supabase to mint the link.
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; ok?: boolean } | null;
    if (res.ok) return;
    // If the route is missing/unconfigured, fall through to the client Supabase path.
    if (res.status !== 404 && res.status !== 501 && data?.error) {
      // 200-style soft success is preferred; only throw real client errors.
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        throw new Error(data.error);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message && !error.message.includes("fetch")) {
      // Re-throw intentional API errors (invalid email, rate limit, etc.).
      if (!/Failed to fetch|NetworkError|404/i.test(error.message)) throw error;
    }
  }

  if (!isAuthEnabled()) {
    throw new Error("Password reset is unavailable until Supabase Auth is configured.");
  }

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
  const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(trimmed, {
    redirectTo,
  });
  if (error) throw error;
}

export function authHeaders(accessToken: string | null | undefined): HeadersInit {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}
