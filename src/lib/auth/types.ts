export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  /** true when using local guest mode (no synced auth session). */
  isGuest: boolean;
};

export const GUEST_USER_ID = "guest";

export const GUEST_USER: AuthUser = {
  id: GUEST_USER_ID,
  email: null,
  displayName: "Guest",
  avatarUrl: null,
  isGuest: true,
};
