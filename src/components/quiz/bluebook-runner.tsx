"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, ChevronLeft, ChevronRight, Flag, Loader2, LogOut, BookOpenCheck } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { QuestionView } from "@/components/quiz/question-view";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { apiPost, apiPatch, mutateKey } from "@/lib/api-client";
import { answersMatch, cn, difficultyColor, formatTime } from "@/lib/utils";
import type { PracticeTestDetail } from "@/lib/types";

type ModuleKey = "rw1" | "rw2" | "math1" | "math2";

export function BluebookRunner({
  test,
  sessionId,
  onExit,
}: {
  test: PracticeTestDetail;
  sessionId: string;
  onExit: () => void;
}) {
  const router = useRouter();
  const modules = React.useMemo(
    () =>
      [
        { key: "rw1" as ModuleKey, title: "Reading & Writing · Module 1", minutes: Math.round(test.rwMinutes / 2), questions: test.modules.rw1 },
        { key: "rw2" as ModuleKey, title: "Reading & Writing · Module 2", minutes: Math.round(test.rwMinutes / 2), questions: test.modules.rw2 },
        { key: "math1" as ModuleKey, title: "Math · Module 1", minutes: Math.round(test.mathMinutes / 2), questions: test.modules.math1 },
        { key: "math2" as ModuleKey, title: "Math · Module 2", minutes: Math.round(test.mathMinutes / 2), questions: test.modules.math2 },
      ].filter((m) => m.questions.length > 0),
    [test],
  );

  const [moduleIdx, setModuleIdx] = React.useState(0);
  const [qIdx, setQIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = React.useState(modules[0].minutes * 60);
  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [graded, setGraded] = React.useState<Record<string, { correct: boolean; answer: string }>>({});

  const mod = modules[moduleIdx];
  const current = mod.questions[qIdx];
  const chosen = current ? answers[current.id] : undefined;
  const isLastModule = moduleIdx === modules.length - 1;
  const lowTime = secondsLeft <= 300;

  // countdown
  React.useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done, moduleIdx]);

  // auto-advance when the clock runs out
  const advanceRef = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    if (secondsLeft === 0 && !done) advanceRef.current();
  }, [secondsLeft, done]);

  const finishTest = React.useCallback(async () => {
    if (finishing || done) return;
    setFinishing(true);
    try {
      const all = modules.flatMap((m) => m.questions);
      const attempts = all
        .filter((q) => answers[q.id] && answers[q.id].trim() !== "")
        .map((q) => ({ questionId: q.id, isCorrect: answersMatch(answers[q.id], q.correctAnswer), answer: answers[q.id] }));
      if (attempts.length > 0)
        await apiPost("/api/attempts", { sessionId, mode: "bluebook", attempts });
      const g: Record<string, { correct: boolean; answer: string }> = {};
      attempts.forEach((a) => { g[a.questionId] = { correct: a.isCorrect, answer: a.answer! }; });
      setGraded(g);
      const answeredCount = attempts.length;
      const correctCount = attempts.filter((a) => a.isCorrect).length;
      await apiPatch(`/api/sessions/${sessionId}`, { correctCount, answeredCount });
      mutateKey("stats");
      mutateKey("mistakes");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error("Couldn't submit the test", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setFinishing(false);
    }
  }, [answers, modules, sessionId, finishing, done]);

  const advance = React.useCallback(() => {
    if (isLastModule) {
      finishTest();
    } else {
      setModuleIdx((m) => {
        const next = m + 1;
        setSecondsLeft(modules[next].minutes * 60);
        return next;
      });
      setQIdx(0);
      setConfirmEnd(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isLastModule, finishTest, modules]);
  advanceRef.current = advance;

  if (done) {
    const rwQs = [...modules[0].questions, ...(modules[1]?.questions ?? [])];
    const mathQs = [...(modules[2]?.questions ?? []), ...(modules[3]?.questions ?? [])];
    const rwCorrect = rwQs.filter((q) => graded[q.id]?.correct).length;
    const mathCorrect = mathQs.filter((q) => graded[q.id]?.correct).length;
    const totalCorrect = rwCorrect + mathCorrect;
    const total = rwQs.length + mathQs.length;
    return (
      <GlassCard hover={false} className="p-6 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7aa5f2] to-[#3a5fc8] shadow-[0_8px_24px_rgba(58,95,200,0.4)]">
            <BookOpenCheck className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display mt-4 text-3xl font-bold text-[#2b2b2a]">{test.title} submitted</h2>
          <p className="mt-1 text-[15px] text-[#8a8680]">Bluebook mode — full review now unlocked</p>
          <p className="mt-4 text-[17px] font-semibold">
            Raw score: <span className="hl-yellow px-1">{totalCorrect} / {total}</span>
          </p>
          <div className="mt-6 grid w-full max-w-md gap-3 sm:grid-cols-2">
            <div className="glass-subtle px-5 py-4 text-center">
              <div className="font-display text-2xl font-bold text-[#3a5fc8]">{rwCorrect} / {rwQs.length}</div>
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#8a8680]">Reading & Writing</div>
            </div>
            <div className="glass-subtle px-5 py-4 text-center">
              <div className="font-display text-2xl font-bold text-[#238a5e]">{mathCorrect} / {mathQs.length}</div>
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#8a8680]">Math</div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="btn btn-primary" href={`/bluebook/review?session=${sessionId}`}>
              Open full review with explanations
            </Link>
            <button className="btn btn-ghost" onClick={() => router.push("/bluebook")}>Back to tests</button>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (!current) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        {/* Bluebook header */}
        <GlassCard hover={false} className="flex flex-wrap items-center gap-3 !rounded-2xl px-4 py-3">
          <button className="btn btn-ghost !px-2" onClick={onExit} title="Exit test"><LogOut className="h-4 w-4" /></button>
          <div className="min-w-0 grow">
            <div className="truncate text-[13px] font-bold text-[#2b2b2a]">{test.title}</div>
            <div className="text-[11.5px] font-medium text-[#8a8680]">{mod.title} · Question {qIdx + 1} of {mod.questions.length}</div>
          </div>
          <div className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-[15px] font-bold",
            lowTime ? "border-[#f3ccd4] bg-[#fdf0f2] text-[#a33046] gentle-pulse" : "border-[#e2dbc9] bg-[#f8f5ec] text-[#2b2b2a]",
          )}>
            <AlarmClock className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </div>
        </GlassCard>

        {/* Question */}
        <GlassCard hover={false} className="p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="badge badge-blue">{current.domain}</span>
            <span className="badge">{current.skill}</span>
            <span className={cn("badge border", difficultyColor(current.difficulty))}>{current.difficulty}</span>
            <div className="ml-auto">
              <button
                onClick={() => setFlags((f) => ({ ...f, [current.id]: !f[current.id] }))}
                title={flags[current.id] ? "Unflag" : "Flag for review"}
                aria-label="Flag question"
                className="rounded-lg p-2 transition-colors hover:bg-[#f2ecdd]"
              >
                <Flag className={cn("h-[18px] w-[18px]", flags[current.id] ? "fill-[#ffb74a] stroke-[#d9922e]" : "stroke-[#a8a294]")} />
              </button>
            </div>
          </div>

          <QuestionView
            question={current}
            selected={chosen}
            onSelect={(v) => setAnswers((a) => ({ ...a, [current.id]: v }))}
            graded={false}
            lockSelection={false}
            showExplanation={false}
          />

          <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[#f0ead9] pt-5">
            <button className="btn btn-soft" disabled={qIdx === 0} onClick={() => setQIdx((i) => Math.max(0, i - 1))}>
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {qIdx < mod.questions.length - 1 ? (
              <button className="btn btn-soft" onClick={() => setQIdx((i) => Math.min(mod.questions.length - 1, i + 1))}>
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setConfirmEnd(true)}>
                {isLastModule ? "Submit test" : "End module"}
              </button>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Module navigator */}
      <GlassCard hover={false} className="h-fit p-4 lg:sticky lg:top-6">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8680]">
          {mod.title}
        </p>
        <div className="grid grid-cols-9 gap-1.5 lg:grid-cols-6">
          {mod.questions.map((q, i) => {
            const a = answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => setQIdx(i)}
                className={cn(
                  "relative flex h-8 items-center justify-center rounded-lg border text-[11.5px] font-bold transition-all",
                  i === qIdx
                    ? "border-[#3a5fc8] bg-[#3a5fc8] text-white shadow-[0_2px_6px_rgba(58,95,200,0.4)]"
                    : a && a.trim() !== ""
                      ? "border-[#c9d6f5] bg-[#eef2fd] text-[#3053ad]"
                      : "border-[#e7e0d0] bg-white text-[#8a8680] hover:border-[#cfc5ae]",
                )}
              >
                {i + 1}
                {flags[q.id] && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ffb74a] ring-2 ring-white" />}
              </button>
            );
          })}
        </div>
        <button className="btn btn-soft mt-4 w-full !py-2 text-[12.5px]" onClick={() => setConfirmEnd(true)}>
          {isLastModule ? "Submit test" : "End module early"}
        </button>
        <div className="mt-3 border-t border-[#f0ead9] pt-3 text-[10.5px] leading-relaxed text-[#8a8680]">
          Module {moduleIdx + 1} of {modules.length}. You cannot return to a completed module — just like the real Bluebook app.
        </div>
      </GlassCard>

      {/* Confirm end dialog */}
      <PaperDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title={isLastModule ? "Submit the test?" : `End ${mod.title}?`}
        description="You won't be able to come back to this module once it's closed."
      >
        <div className="mt-3 rounded-xl bg-[#fff8e6] px-4 py-3 text-[13px] text-[#8a6100]">
          {mod.questions.filter((q) => !answers[q.id] || answers[q.id].trim() === "").length} question(s) in this module still have no answer.
        </div>
        <div className="mt-5 flex gap-2.5">
          <button className="btn btn-primary grow" onClick={advance} disabled={finishing}>
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLastModule ? "Submit test" : "End module"}
          </button>
          <button className="btn btn-soft" onClick={() => setConfirmEnd(false)}>Keep working</button>
        </div>
      </PaperDialog>
    </div>
  );
}
