"use client";

import type { AdaptiveRoute } from "@/lib/types";

export type BluebookProgress = {
  version: 1;
  testId: string;
  sessionId: string;
  stage: 0 | 1 | 2 | 3;
  questionIndex: number;
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  secondsLeft: number;
  rwRoute: AdaptiveRoute | null;
  mathRoute: AdaptiveRoute | null;
  rwRoutingScore: { correct: number; total: number } | null;
  mathRoutingScore: { correct: number; total: number } | null;
  updatedAt: string;
};

const prefix = "sat-bluebook-progress:";
const keyFor = (testId: string) => `${prefix}${testId}`;

export function readBluebookProgress(testId: string): BluebookProgress | null {
  try {
    const raw = localStorage.getItem(keyFor(testId));
    if (!raw) return null;
    const value = JSON.parse(raw) as BluebookProgress;
    if (value?.version !== 1 || value.testId !== testId || !value.sessionId) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveBluebookProgress(progress: BluebookProgress) {
  try { localStorage.setItem(keyFor(progress.testId), JSON.stringify(progress)); } catch { /* storage unavailable */ }
}

export function removeBluebookProgress(testId: string) {
  try { localStorage.removeItem(keyFor(testId)); } catch { /* storage unavailable */ }
}

export function clearAllBluebookProgress() {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith(prefix)).forEach((key) => localStorage.removeItem(key));
  } catch { /* storage unavailable */ }
}
