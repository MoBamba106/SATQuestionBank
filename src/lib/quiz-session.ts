"use client";

import type { useRouter } from "next/navigation";

type AppRouterInstance = ReturnType<typeof useRouter>;

export type PoolLaunch = {
  label: string;
  ids: string[];
  mode?: "practice" | "mistakes" | "collection" | "favorites" | "session";
};

const KEY = "sat-quiz-pool";

/** Store an explicit pool before navigating. WebView sessionStorage also works in Tauri. */
export function launchPoolQuiz(router: AppRouterInstance, pool: PoolLaunch) {
  const normalized = { ...pool, ids: Array.from(new Set(pool.ids.map(String).filter(Boolean))) };
  if (normalized.ids.length === 0) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(normalized));
  } catch {
    return;
  }
  // A nonce makes repeated launches from the same page a distinct navigation.
  router.push(`/quiz?pool=${Date.now()}`);
}

/** Read without deleting so a failed request can be retried. */
export function readPool(): PoolLaunch | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.ids) || parsed.ids.length === 0) return null;
    return {
      label: String(parsed.label ?? "Selected questions"),
      ids: Array.from(new Set(parsed.ids.map(String).filter(Boolean))),
      mode: parsed.mode,
    };
  } catch {
    return null;
  }
}

export function clearPool() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage may be unavailable in a hardened webview; nothing else to clear.
  }
}
