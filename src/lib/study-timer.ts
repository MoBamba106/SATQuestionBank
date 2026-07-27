"use client";

export const STUDY_TIMER_OPEN_EVENT = "sat-nexus-open-study-timer";

export function openStudyTimer() {
  window.dispatchEvent(new Event(STUDY_TIMER_OPEN_EVENT));
}
