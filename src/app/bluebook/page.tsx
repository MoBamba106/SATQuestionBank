"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MonitorSmartphone, Clock, BookOpen, Calculator, GitBranch, Loader2, Play, Info, WandSparkles, X, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { apiDelete, apiPost, mutateKey, useApi } from "@/lib/api-client";
import { readBluebookProgress, removeBluebookProgress, type BluebookProgress } from "@/lib/bluebook-cache";
import type { PracticeTestInfo } from "@/lib/types";

export default function BluebookPage() {
  const router = useRouter();
  const { data, loading, error } = useApi<{ tests: PracticeTestInfo[] }>("/api/practice-tests", "tests");
  const [selected, setSelected] = React.useState<PracticeTestInfo | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [saved, setSaved] = React.useState<Record<string, BluebookProgress>>({});

  React.useEffect(() => {
    if (!data?.tests) return;
    const timer = window.setTimeout(() => {
      const next: Record<string, BluebookProgress> = {};
      for (const test of data.tests) {
        const progress = readBluebookProgress(test.id);
        if (progress) next[test.id] = progress;
      }
      setSaved(next);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data?.tests]);

  const begin = () => {
    if (!selected || starting) return;
    setStarting(true);
    router.push(`/quiz?test=${selected.id}${saved[selected.id] ? "&resume=1" : ""}`);
  };

  const generateTest = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const generated = await apiPost<{ id: string }>("/api/practice-tests/generate");
      mutateKey("tests");
      router.push(`/quiz?test=${generated.id}`);
    } catch (error) {
      toast.error("Could not generate a practice test", { description: error instanceof Error ? error.message : undefined });
      setGenerating(false);
    }
  };

  const discardSaved = async (testId: string) => {
    const progress = saved[testId];
    removeBluebookProgress(testId);
    setSaved((current) => {
      const next = { ...current };
      delete next[testId];
      return next;
    });
    if (progress?.sessionId) {
      try { await apiDelete(`/api/sessions/${progress.sessionId}`); } catch { /* local cache is already cleared */ }
    }
  };

  const deleteGenerated = async (test: PracticeTestInfo) => {
    if (!test.isCustom) return;
    if (!window.confirm(`Delete “${test.title}”? This cannot be undone.`)) return;
    try {
      removeBluebookProgress(test.id);
      setSaved((current) => {
        const next = { ...current };
        delete next[test.id];
        return next;
      });
      await apiDelete(`/api/practice-tests/${test.id}`);
      mutateKey("tests");
      if (selected?.id === test.id) setSelected(null);
      toast.success("Generated test deleted");
    } catch (error) {
      toast.error("Could not delete test", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
            Bluebook <span className="hl-blue px-1">Practice Tests</span>
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] text-[var(--ink-faint)]">
            Timed digital SAT practice with adaptive Reading &amp; Writing and Math sections.
            Your Module 1 performance routes you to an easier or harder Module 2.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={generateTest} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
          {generating ? "Building test…" : "Generate new test"}
        </button>
      </div>

      <div className="glass-subtle flex items-start gap-3 px-4 py-3.5">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#3a5fc8]" />
        <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">
          Each test uses official College Board question-bank items and the digital SAT module
          sizes: 27 Reading &amp; Writing questions and 22 Math questions per module. A score of at
          least 60% on a section&apos;s first module selects its harder second module; otherwise the
          easier route is used. Timing is 32 minutes per R&amp;W module and 35 minutes per Math module.
        </p>
      </div>

      {error && (
        <div className="rounded-[6px] border border-[#f3ccd4] bg-[#fdf0f2] px-4 py-3 text-[13.5px] font-semibold text-[#a33046]">
          {error}
        </div>
      )}

      {loading ? (
        <PageSkeleton cards={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.tests ?? []).map((t) => {
            const progress = saved[t.id];
            return (
            <GlassCard key={t.id} className="flex flex-col p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                    {t.isCustom ? "Generated Test" : "Practice Test"}
                  </div>
                  <div className={t.isCustom ? "font-display mt-1 text-2xl font-bold text-[var(--accent)]" : "font-display mt-0.5 text-5xl font-bold text-[var(--accent)]"}>
                    {t.isCustom ? "Custom" : t.testNumber}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {progress && (
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); void discardSaved(t.id); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink-faint)] hover:border-[var(--bad)] hover:text-[var(--bad)]"
                      aria-label={`Discard saved ${t.title} and restart`}
                      title="Remove saved progress"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {t.isCustom && (
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); void deleteGenerated(t); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink-faint)] hover:border-[var(--bad)] hover:text-[var(--bad)]"
                      aria-label={`Delete generated test ${t.title}`}
                      title="Delete generated test"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                    <MonitorSmartphone className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <p className="mt-2 text-[12px] font-medium text-[var(--ink-faint)]">{t.releaseLabel}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-[5px] border border-[var(--line)] bg-[var(--paper-soft)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--ink-soft)]">
                  <GitBranch className="h-3.5 w-3.5" /> Adaptive Module 2
                </span>
                {progress && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-[5px] border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 text-[10.5px] font-bold text-[var(--accent-dark)]">
                    Saved · Module {progress.stage + 1}, Q{progress.questionIndex + 1}
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="glass-subtle flex items-center gap-2.5 px-3 py-2.5">
                  <BookOpen className="h-4 w-4 shrink-0 text-[#3a5fc8]" />
                  <div>
                    <div className="text-[14px] font-bold text-[var(--ink)]">{t.rwQuestions}</div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">R&W · {t.rwMinutes}m</div>
                  </div>
                </div>
                <div className="glass-subtle flex items-center gap-2.5 px-3 py-2.5">
                  <Calculator className="h-4 w-4 shrink-0 text-[#238a5e]" />
                  <div>
                    <div className="text-[14px] font-bold text-[var(--ink)]">{t.mathQuestions}</div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Math · {t.mathMinutes}m</div>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink-faint)]">
                <Clock className="h-3.5 w-3.5" />
                {t.rwMinutes + t.mathMinutes} minutes total · {t.totalQuestions} questions
              </div>

              <button className="btn btn-primary mt-5 w-full" onClick={() => setSelected(t)}>
                <Play className="h-4 w-4" /> {progress ? "Resume test" : "Start test"}
              </button>
            </GlassCard>
            );
          })}
        </div>
      )}

      <PaperDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? `${saved[selected.id] ? "Resume" : "Start"} ${selected.title}?` : ""}
        description={selected && saved[selected.id]
          ? "Continue from the exact module, question, answers, flags, and time you saved."
          : "Answers stay hidden until submission. Module 1 performance selects the adaptive Module 2 route."}
      >
        {selected && (
          <>
            <div className="mt-4 space-y-2.5 rounded-[6px] bg-[var(--paper-soft)] p-4 text-[13.5px]">
              <div className="flex justify-between"><span className="text-[var(--ink-faint)]">Reading & Writing</span><span className="font-semibold text-[var(--ink)]">{selected.rwQuestions} questions · {selected.rwMinutes} min</span></div>
              <div className="flex justify-between"><span className="text-[var(--ink-faint)]">Math</span><span className="font-semibold text-[var(--ink)]">{selected.mathQuestions} questions · {selected.mathMinutes} min</span></div>
              <div className="flex justify-between border-t border-[#e7ddc8] pt-2.5"><span className="text-[var(--ink-faint)]">Total</span><span className="font-bold text-[var(--ink)]">{selected.totalQuestions} questions · {selected.rwMinutes + selected.mathMinutes} min</span></div>
            </div>
            <div className="mt-3 rounded-[6px] bg-[#fff8e6] px-4 py-3 text-[12.5px] leading-relaxed text-[#8a6100]">
              Modules lock when you leave them, and the timer keeps running. Set aside{" "}
              {selected.rwMinutes + selected.mathMinutes} uninterrupted minutes.
            </div>
            <div className="mt-5 flex gap-2.5">
              <button className="btn btn-primary grow" onClick={begin} disabled={starting}>
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {saved[selected.id] ? "Resume test" : "Begin test"}
              </button>
              <button className="btn btn-soft" onClick={() => setSelected(null)}>Not now</button>
            </div>
          </>
        )}
      </PaperDialog>
    </div>
  );
}
