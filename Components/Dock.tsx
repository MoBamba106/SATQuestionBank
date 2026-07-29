import Link from "next/link";
import React from "react";

export function Dock() {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-3 rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-2 shadow-lg backdrop-blur-md">
      <Link href="/" className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
        Bank
      </Link>
      <Link href="/quiz" className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
        Quiz
      </Link>
      <Link href="/analytics" className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
        Analytics
      </Link>
    </nav>
  );
}
