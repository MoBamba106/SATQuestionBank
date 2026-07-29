import React from "react";

export function StepperLogin() {
  return (
    <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[var(--ink)]">Sign in</h2>
      <p className="text-sm text-[var(--ink-faint)]">Use Supabase Auth to access your SAT data.</p>
    </div>
  );
}
