"use client";

import type { Session, User } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/auth/types";
import { GUEST_USER } from "@/lib/auth/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";

const TOKEN_KEY = "sat_nexus_access_token";
const USER_KEY = "sat_nexus_auth_user";

export type ClientAuthState = {
  user: AuthUser;
  accessToken: string | null;
  ready: boolean;
};

function supabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

function userFromSupabase(user: User | null | undefined): AuthUser {
  if (!user) return GUEST_USER;

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
    window.localStorage.setItem(USER_KEY, JSON.stringify(GUEST_USER));
    document.cookie = "sat_nexus_access_token=; path=/; max-age=0; samesite=lax";
    return;
  }

  const user = userFromSupabase(session.user);
  window.localStorage.setItem(TOKEN_KEY, session.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `sat_nexus_access_token=${encodeURIComponent(session.access_token)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

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

export function isAuthEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && supabasePublicKey());
}

export async function getCurrentAuthState(): Promise<{ user: AuthUser; accessToken: string | null }> {
  if (!isAuthEnabled()) return { user: GUEST_USER, accessToken: null };

  try {
    const {
      data: { session },
      error,
    } = await getSupabaseBrowserClient().auth.getSession();
    if (error) throw error;
    persistSessionState(session);
    return session?.user
      ? { user: userFromSupabase(session.user), accessToken: session.access_token }
      : { user: GUEST_USER, accessToken: null };
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
        : { user: GUEST_USER, accessToken: null },
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

export function authHeaders(accessToken: string | null | undefined): HeadersInit {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}
