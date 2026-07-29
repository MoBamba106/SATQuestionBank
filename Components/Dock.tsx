import React from "react";

export function Dock() {
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-3 rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-2 shadow-lg backdrop-blur-md">
      <a href="/" className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]">Bank</a>
      <a href="/quiz" className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]">Quiz</a>
      <a href="/analytics" className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]">Analytics</a>
    </nav>
  );
}
