"use client";

import { cn, skillColor } from "@/lib/utils";
import type { SkillBand } from "@/lib/types";

export function SkillBands({ bands }: { bands: SkillBand[] }) {
  const sections = ["Reading & Writing", "Math"];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sections.map((section) => (
        <div key={section} className="rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] p-4">
          <h3 className="font-display text-lg font-bold text-[var(--ink)]">{section}</h3>
          <div className="mt-3 space-y-3">
            {bands.filter((band) => band.section === section).map((band) => (
              <div key={band.domain}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className={cn("badge max-w-[78%] truncate", skillColor(band.domain))}>{band.domain}</span>
                  <span className="font-mono text-[11px] font-bold text-[var(--ink-faint)]">{band.band}/5</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5" aria-label={`${band.domain}: ${band.band} of 5 performance bars`}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <span
                      key={level}
                      className={cn(
                        "h-2.5 rounded-[3px] border",
                        level <= band.band
                          ? "border-[var(--accent)] bg-[var(--accent)]"
                          : "border-[var(--line)] bg-[var(--paper-soft)]",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[10.5px] text-[var(--ink-faint)]">{band.correct}/{band.total} correct</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
