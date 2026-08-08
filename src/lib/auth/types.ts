export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  /** true when using local guest mode (no synced auth session). */
  isGuest: boolean;
  /** true when the signed-in email is listed in ADMIN_EMAILS (server-verified). */
  isAdmin?: boolean;
};

/** Legacy shared guest row — kept only for migration / exclusion filters. */
export const GUEST_USER_ID = "guest";

/** Prefix for per-browser local guest identities (guest_<uuid>). */
export const LOCAL_GUEST_PREFIX = "guest_";

export function isLocalGuestId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === GUEST_USER_ID || id.startsWith(LOCAL_GUEST_PREFIX);
}

export function makeLocalGuestUser(id?: string): AuthUser {
  const guestId =
    id && isLocalGuestId(id)
      ? id
      : typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `${LOCAL_GUEST_PREFIX}${crypto.randomUUID()}`
        : `${LOCAL_GUEST_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: guestId,
    email: null,
    displayName: "Guest",
    avatarUrl: null,
    isGuest: true,
  };
}

/** Placeholder only — real guest identity is minted per browser in auth/client. */
export const GUEST_USER: AuthUser = {
  id: GUEST_USER_ID,
  email: null,
  displayName: "Guest",
  avatarUrl: null,
  isGuest: true,
};
