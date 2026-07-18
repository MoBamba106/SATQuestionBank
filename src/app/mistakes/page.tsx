"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Play, Loader2, PartyPopper, Shuffle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperSelect } from "@/components/ui/paper-select";
import { QuestionCard } from "@/components/question-card";
import { useApi } from "@/lib/api-client";
import { launchPoolQuiz } from "@/lib/quiz-session";
import { cn } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

export default function MistakesPage() {
  const router = useRouter();
  const [domain, setDomain] = React.useState("All");
  const [daysBack, setDaysBack] = React.useState("0");
  const [neverCorrected, setNeverCorrected] = React.useState(false);

  const qs = React.useMemo(() => {
    const p = new URLSearchParams();
    if (domain !== "All") p.set("domain", domain);
    if (daysBack !== "0") p.set("daysBack", daysBack);
    if (neverCorrected) p.set("neverCorrected", "1");
    return p.toString();
  }, [domain, daysBack, neverCorrected]);

  const { data, loading, error } = useApi<{ count: number; questions: SATQuestion[] }>(
    `/api/mistakes?${qs}`,
    "mistakes",
  );
  const mistakes = data?.questions ?? [];

  const neverCount = mistakes.filter((q) => q.timesCorrect === 0).length;
  const avgMastery = mistakes.length
    ? Math.round(mistakes.reduce((s, q) => s + q.mastery, 0) / mistakes.length)
    : 0;

  const practiceAll = () => {
    if (mistakes.length === 0) return;
    launchPoolQuiz(router, {
      label: `Mistake review · ${mistakes.length} questions`,
      ids: mistakes.map((q) => q.id),
      mode: "mistakes",
    });
  };

  const practiceOne = (q: SATQuestion) =>
    launchPoolQuiz(router, { label: "Mistake retry · 1 question", ids: [q.id], mode: "mistakes" });

  const practiceTen = () => {
    if (mistakes.length === 0) return;
    const shuffled = [...mistakes].sort(() => Math.random() - 0.5).slice(0, 10);
    launchPoolQuiz(router, { label: "Mistake blitz · 10 random", ids: shuffled.map((q) => q.id), mode: "mistakes" });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
          Mistake <span className="hl-yellow px-1">Bank</span>
        </h1>
        <p className="mt-1 text-[15px] text-[#8a8680]">
          Questions whose latest answer was wrong. Answer one correctly and it leaves the bank automatically.
        </p>
      </div>

      {/* Filters — custom dropdowns only */}
      <GlassCard hover={false} className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <PaperSelect
            ariaLabel="Domain"
            value={domain}
            onValueChange={setDomain}
            options={[
              { value: "All", label: "All domains" },
              { value: "Math", label: "Math" },
              { value: "Reading & Writing", label: "Reading & Writing" },
            ]}
          />
          <PaperSelect
            ariaLabel="Time period"
            value={daysBack}
            onValueChange={setDaysBack}
            options={[
              { value: "0", label: "All time" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
          />
          <button
            onClick={() => setNeverCorrected((v) => !v)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border-[1.5px] px-3.5 py-2.5 text-left text-sm transition-all",
              neverCorrected
                ? "border-[#3a5fc8] bg-[#eef2fd]"
                : "border-[#d5cfc0] bg-white hover:border-[#c0b8a2]",
            )}
          >
            <span className={cn("text-[14px]", neverCorrected ? "font-semibold text-[#3053ad]" : "text-[#55524a]")}>
              Never corrected only
            </span>
            <span
              className={cn(
                "relative h-[22px] w-[40px] rounded-full transition-colors",
                neverCorrected ? "bg-[#3a5fc8]" : "bg-[#e0d9c8]",
              )}
            >
              <span
                className={cn(
                  "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all",
                  neverCorrected ? "left-[21px]" : "left-[3px]",
                )}
              />
            </span>
          </button>
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard hover={false} className="p-5 text-center">
          <div className="font-display text-3xl font-bold text-[#d95670]">{loading ? "…" : mistakes.length}</div>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-[#8a8680]">Open mistakes</div>
        </GlassCard>
        <GlassCard hover={false} className="p-5 text-center">
          <div className="font-display text-3xl font-bold text-[#d9922e]">{loading ? "…" : `${avgMastery}%`}</div>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-[#8a8680]">Avg mastery</div>
        </GlassCard>
        <GlassCard hover={false} className="p-5 text-center">
          <div className="font-display text-3xl font-bold text-[#3a5fc8]">{loading ? "…" : neverCount}</div>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-[#8a8680]">Never corrected</div>
        </GlassCard>
      </div>

      {/* Actions — you CAN now take your mistakes */}
      {mistakes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={practiceAll}>
            <Play className="h-4 w-4" /> Practice all {mistakes.length} mistakes
          </button>
          <button className="btn btn-soft" onClick={practiceTen}>
            <Shuffle className="h-4 w-4" /> Blitz 10 random
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#f3ccd4] bg-[#fdf0f2] px-4 py-3 text-[13.5px] font-semibold text-[#a33046]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[#8a8680]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading mistakes…
        </div>
      ) : mistakes.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <PartyPopper className="mx-auto mb-3 h-10 w-10 text-[#2ca974]" />
          <p className="font-display text-2xl font-bold text-[#2b2b2a]">No open mistakes!</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-[#8a8680]">
            Either you haven&apos;t missed anything yet or you&apos;ve corrected it all. Keep it up.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mistakes.map((q) => (
            <div key={q.id} className="relative">
              <QuestionCard question={q} />
              <button
                onClick={() => practiceOne(q)}
                title="Retry this question"
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-[#f3ccd4] bg-[#fdf0f2] px-2.5 py-1 text-[10.5px] font-bold text-[#a33046] transition-all hover:bg-[#fce3e8]"
              >
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
