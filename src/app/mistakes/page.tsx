"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Play, Loader2, PartyPopper, Shuffle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperSelect } from "@/components/ui/paper-select";
import { QuestionCard } from "@/components/question-card";
import { useAuth } from "@/components/auth-provider";
import { apiPost, getImpersonatedUser, mutateKey, useApi } from "@/lib/api-client";
import { launchPoolQuiz } from "@/lib/quiz-session";
import { cn } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

export default function MistakesPage() {
  const router = useRouter();
  const auth = useAuth();
  const [domain, setDomain] = React.useState("All");
  const [daysBack, setDaysBack] = React.useState("0");
  const [neverCorrected, setNeverCorrected] = React.useState(false);
  const [overriding, setOverriding] = React.useState<string | null>(null);

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

  /**
   * Admin-only manual override: mark any question as correct for the user
   * currently in view (the impersonated account when an admin is "Viewing as"
   * someone, otherwise the signed-in admin). This flips every wrong attempt
   * for (user, question) to correct, which removes the entry from the mistake
   * bank and restores global accuracy metrics.
   */
  const adminOverride = async (q: SATQuestion) => {
    if (overriding) return;
    setOverriding(q.id);
    try {
      const targetId = getImpersonatedUser()?.id ?? auth.user.id;
      const res = await apiPost<{ updated: number }>("/api/admin/override", {
        userId: targetId,
        questionId: q.id,
      });
      toast.success("Marked correct", {
        description:
          res.updated > 0
            ? `${res.updated} attempt${res.updated === 1 ? "" : "s"} corrected — removed from the mistake bank.`
            : "Question removed from the mistake bank.",
      });
      mutateKey("mistakes");
      mutateKey("stats");
      mutateKey("admin-overview");
    } catch (e) {
      toast.error("Couldn't override", { description: e instanceof Error ? e.message : "Please try again" });
    } finally {
      setOverriding(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
          Mistake <span className="hl-yellow px-1">Bank</span>
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-faint)]">
          Questions whose latest answer was wrong. Answer one correctly and it leaves the bank automatically.
        </p>
      </div>

      {/* Filters — custom dropdowns only */}
      <GlassCard hover={false} className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <PaperSelect
            ariaLabel="Section"
            tone="lavender"
            value={domain}
            onValueChange={setDomain}
            options={[
              { value: "All", label: "All sections", tone: "lavender" },
              { value: "Math", label: "Math", tone: "teal" },
              { value: "Reading & Writing", label: "Reading & Writing", tone: "lavender" },
            ]}
          />
          <PaperSelect
            ariaLabel="Time period"
            tone="yellow"
            value={daysBack}
            onValueChange={setDaysBack}
            options={[
              { value: "0", label: "All time", tone: "yellow" },
              { value: "7", label: "Last 7 days", tone: "peach" },
              { value: "30", label: "Last 30 days", tone: "yellow" },
              { value: "90", label: "Last 90 days", tone: "green" },
            ]}
          />
          <button
            onClick={() => setNeverCorrected((v) => !v)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-[6px] border-[1.5px] px-3.5 py-2.5 text-left text-sm transition-all",
              neverCorrected
                ? "border-[#b5cdbd] bg-[#dfece3]"
                : "border-[var(--line)] bg-[var(--paper-raised)] hover:border-[#b5cdbd]",
            )}
          >
            <span className={cn("text-[14px]", neverCorrected ? "font-semibold text-[#477b5c]" : "text-[var(--ink-soft)]")}>
              Never corrected only
            </span>
            <span
              className={cn(
                "relative h-[22px] w-[40px] rounded-full transition-colors",
                neverCorrected ? "bg-[#5ba57b]" : "bg-[#d4c8bd]",
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

      {/* Stats — sans-serif metrics with theme tokens to match the global design system */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard hover={false} className="p-5 text-center">
          <div className="font-sans text-[28px] font-bold leading-tight tracking-tight text-[var(--ink)]">{loading ? "…" : mistakes.length}</div>
          <div className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">Open mistakes</div>
        </GlassCard>
        <GlassCard hover={false} className="p-5 text-center">
          <div className="font-sans text-[28px] font-bold leading-tight tracking-tight text-[var(--ink)]">{loading ? "…" : `${avgMastery}%`}</div>
          <div className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">Avg mastery</div>
        </GlassCard>
        <GlassCard hover={false} className="p-5 text-center">
          <div className="font-sans text-[28px] font-bold leading-tight tracking-tight text-[var(--ink)]">{loading ? "…" : neverCount}</div>
          <div className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">Never corrected</div>
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
        <div className="rounded-[6px] border border-[#f3ccd4] bg-[#fdf0f2] px-4 py-3 text-[13.5px] font-semibold text-[#a33046]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[var(--ink-faint)]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading mistakes…
        </div>
      ) : mistakes.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <PartyPopper className="mx-auto mb-3 h-10 w-10 text-[#2ca974]" />
          <p className="font-display text-2xl font-bold text-[var(--ink)]">No open mistakes!</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-[var(--ink-faint)]">
            Either you haven&apos;t missed anything yet or you&apos;ve corrected it all. Keep it up.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mistakes.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              footer={
                <div className="flex w-full flex-wrap items-center gap-2">
                  <button
                    onClick={() => practiceOne(q)}
                    title="Retry this question"
                    className="btn btn-primary !min-h-8 !px-3 !py-1.5 !text-[12px]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Retry
                  </button>
                  {auth.isAdmin && (
                    <button
                      onClick={() => void adminOverride(q)}
                      disabled={overriding !== null}
                      title="Admin override: mark this question correct for the user in view, removing it from their mistake bank"
                      className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px]"
                    >
                      {overriding === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      Admin Override
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
