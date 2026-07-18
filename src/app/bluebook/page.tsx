"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MonitorSmartphone, Clock, BookOpen, Calculator, Loader2, Play, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { useApi } from "@/lib/api-client";
import type { PracticeTestInfo } from "@/lib/types";

export default function BluebookPage() {
  const router = useRouter();
  const { data, loading, error } = useApi<{ tests: PracticeTestInfo[] }>("/api/practice-tests", "tests");
  const [selected, setSelected] = React.useState<PracticeTestInfo | null>(null);
  const [starting, setStarting] = React.useState(false);

  const begin = () => {
    if (!selected || starting) return;
    setStarting(true);
    router.push(`/quiz?test=${selected.id}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
          Bluebook <span className="hl-blue px-1">Practice Tests</span>
        </h1>
        <p className="mt-1 max-w-2xl text-[15px] text-[#8a8680]">
          Full-length digital SAT simulations matching every practice test in the official Bluebook
          app — Tests 3 through 11, each with the real structure: two Reading &amp; Writing modules
          and two Math modules, module-by-module timing, and no feedback until you submit.
        </p>
      </div>

      <div className="glass-subtle flex items-start gap-3 px-4 py-3.5">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#3a5fc8]" />
        <p className="text-[13px] leading-relaxed text-[#55524a]">
          Each test is assembled from official College Board question-bank items following the
          published module blueprints (27 R&amp;W + 22 Math per module, rising difficulty inside each
          module). Timing mirrors Bluebook: 32 minutes per R&amp;W module, 35 minutes per Math module.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-[#f3ccd4] bg-[#fdf0f2] px-4 py-3 text-[13.5px] font-semibold text-[#a33046]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[#8a8680]">
          <Loader2 className="h-5 w-5 animate-spin" /> Preparing practice tests…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.tests ?? []).map((t) => (
            <GlassCard key={t.id} className="flex flex-col p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-[#8a8680]">
                    Practice Test
                  </div>
                  <div className="font-display mt-0.5 bg-gradient-to-br from-[#3a5fc8] to-[#7aa5f2] bg-clip-text text-5xl font-bold text-transparent">
                    {t.testNumber}
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7aa5f2] to-[#3a5fc8] shadow-[0_4px_12px_rgba(58,95,200,0.35)]">
                  <MonitorSmartphone className="h-5.5 w-5.5 text-white" />
                </div>
              </div>

              <p className="mt-2 text-[12px] font-medium text-[#8a8680]">{t.releaseLabel}</p>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="glass-subtle flex items-center gap-2.5 px-3 py-2.5">
                  <BookOpen className="h-4 w-4 shrink-0 text-[#3a5fc8]" />
                  <div>
                    <div className="text-[14px] font-bold text-[#2b2b2a]">{t.rwQuestions}</div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a8680]">R&W · {t.rwMinutes}m</div>
                  </div>
                </div>
                <div className="glass-subtle flex items-center gap-2.5 px-3 py-2.5">
                  <Calculator className="h-4 w-4 shrink-0 text-[#238a5e]" />
                  <div>
                    <div className="text-[14px] font-bold text-[#2b2b2a]">{t.mathQuestions}</div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#8a8680]">Math · {t.mathMinutes}m</div>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-[#8a8680]">
                <Clock className="h-3.5 w-3.5" />
                {t.rwMinutes + t.mathMinutes} minutes total · {t.totalQuestions} questions
              </div>

              <button className="btn btn-primary mt-5 w-full" onClick={() => setSelected(t)}>
                <Play className="h-4 w-4" /> Start test
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      <PaperDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? `Start ${selected.title}?` : ""}
        description="Bluebook mode: no answer checking, no explanations, locked modules — exactly like test day."
      >
        {selected && (
          <>
            <div className="mt-4 space-y-2.5 rounded-xl bg-[#f6f2e8] p-4 text-[13.5px]">
              <div className="flex justify-between"><span className="text-[#8a8680]">Reading & Writing</span><span className="font-semibold text-[#2b2b2a]">{selected.rwQuestions} questions · {selected.rwMinutes} min</span></div>
              <div className="flex justify-between"><span className="text-[#8a8680]">Math</span><span className="font-semibold text-[#2b2b2a]">{selected.mathQuestions} questions · {selected.mathMinutes} min</span></div>
              <div className="flex justify-between border-t border-[#e7ddc8] pt-2.5"><span className="text-[#8a8680]">Total</span><span className="font-bold text-[#2b2b2a]">{selected.totalQuestions} questions · {selected.rwMinutes + selected.mathMinutes} min</span></div>
            </div>
            <div className="mt-3 rounded-xl bg-[#fff8e6] px-4 py-3 text-[12.5px] leading-relaxed text-[#8a6100]">
              Modules lock when you leave them, and the timer keeps running. Set aside{" "}
              {selected.rwMinutes + selected.mathMinutes} uninterrupted minutes.
            </div>
            <div className="mt-5 flex gap-2.5">
              <button className="btn btn-primary grow" onClick={begin} disabled={starting}>
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Begin test
              </button>
              <button className="btn btn-soft" onClick={() => setSelected(null)}>Not now</button>
            </div>
          </>
        )}
      </PaperDialog>
    </div>
  );
}
