"use client";

import type { useRouter } from "next/navigation";

type AppRouterInstance = ReturnType<typeof useRouter>;

export type PoolLaunch = {
  label: string;
  ids: string[];
  mode?: "practice" | "mistakes" | "collection" | "favorites" | "session";
};

const KEY = "sat-quiz-pool";

/** Hand a set of question ids to the quiz page (survives the router push). */
export function launchPoolQuiz(router: AppRouterInstance, pool: PoolLaunch) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(pool));
  } catch { /* storage full/unavailable — ids list is small so unlikely */ }
  router.push("/quiz?pool=1");
}

export function consumePool(): PoolLaunch | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.ids) || parsed.ids.length === 0) return null;
    return { label: String(parsed.label ?? "Custom quiz"), ids: parsed.ids.map(String), mode: parsed.mode };
  } catch {
    return null;
  }
}
