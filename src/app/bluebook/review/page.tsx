"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { QuestionView } from "@/components/quiz/question-view";
import { apiGet, apiPost } from "@/lib/api-client";
import { cn, difficultyColor } from "@/lib/utils";
import type { PracticeTestDetail, SessionSummary, SATQuestion } from "@/lib/types";
import { toast } from "sonner";

type FlatItem = { q: SATQuestion; moduleLabel: string };

function ReviewInner() {
  const sp = useSearchParams();
  const sessionId = sp.get("session");
  const [session, setSession] = React.useState<SessionSummary | null>(null);
  const [items, setItems] = React.useState<FlatItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sessionId) {
      setError("No session specified.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const s = await apiGet<SessionSummary>(`/api/sessions/${sessionId}`);
        setSession(s);
        if (s.testId) {
          const t = await apiGet<PracticeTestDetail>(`/api/practice-tests/${s.testId}`);
          const flat: FlatItem[] = [
            ...t.modules.rw1.map((q) => ({ q, moduleLabel: "R&W · Module 1" })),
            ...t.modules.rw2.map((q) => ({ q, moduleLabel: "R&W · Module 2" })),
            ...t.modules.math1.map((q) => ({ q, moduleLabel: "Math · Module 1" })),
            ...t.modules.math2.map((q) => ({ q, moduleLabel: "Math · Module 2" })),
          ];
          setItems(flat);
        } else {
          const ids = s.attempts.map((a) => a.questionId);
          if (ids.length) {
            const d = await apiPost<{ questions: SATQuestion[] }>("/api/questions", { ids });
            setItems(d.questions.map((q) => ({ q, moduleLabel: "" })));
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Couldn't load review";
        setError(msg);
        toast.error("Couldn't load review", { description: msg });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[#8a8680]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading review…
      </div>
    );
  if (error)
    return (
      <GlassCard hover={false} className="p-10 text-center">
        <p className="font-display text-xl font-bold text-[#55524a]">{error}</p>
        <Link href="/bluebook" className="btn btn-primary mt-4">Back to tests</Link>
      </GlassCard>
    );

  const attemptMap = new Map(session?.attempts.map((a) => [a.questionId, a]) ?? []);
  const correct = session?.attempts.filter((a) => a.isCorrect).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/bluebook" className="btn btn-ghost !px-2.5"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
            {session?.label ?? "Test"} — Review
          </h1>
          <p className="mt-1 text-[15px] text-[#8a8680]">
            Score: <span className="font-bold text-[#2b2b2a]">{correct} / {items.length}</span> correct
            {session?.finishedAt && <> · finished {new Date(session.finishedAt).toLocaleString()}</>}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map(({ q, moduleLabel }, i) => {
          const a = attemptMap.get(q.id);
          return (
            <GlassCard key={q.id} hover={false} className="p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] font-bold text-[#8a8680]">Q{i + 1}</span>
                {moduleLabel && <span className="badge badge-blue">{moduleLabel}</span>}
                <span className="badge">{q.skill}</span>
                <span className={cn("badge border", difficultyColor(q.difficulty))}>{q.difficulty}</span>
                <span
                  className={cn(
                    "badge ml-auto",
                    !a ? "bg-[#f6f2e8] text-[#8a8680]"
                      : a.isCorrect ? "bg-[#ecf8f1] text-[#238a5e] border-[#bde5cf]"
                      : "bg-[#fdf0f2] text-[#a33046] border-[#f3ccd4]",
                  )}
                >
                  {!a ? "Unanswered" : a.isCorrect ? `Correct — ${a.answer}` : `You answered ${a.answer}`}
                </span>
              </div>
              <QuestionView
                question={q}
                selected={a?.answer ?? undefined}
                onSelect={() => {}}
                graded={!!a}
                lockSelection
                showExplanation
              />
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

export default function BluebookReviewPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-24 text-[#8a8680]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading review…
        </div>
      }
    >
      <ReviewInner />
    </React.Suspense>
  );
}
