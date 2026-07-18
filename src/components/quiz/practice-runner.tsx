"use client";

import * as React from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle, Flag, NotebookPen, Timer, Loader2, LogOut, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { QuestionView } from "@/components/quiz/question-view";
import { QuizResults, type GradedMap } from "@/components/quiz/quiz-results";
import { FavoriteButton } from "@/components/favorite-button";
import { AddToCollectionButton } from "@/components/add-to-collection";
import { apiPost, apiPatch, mutateKey } from "@/lib/api-client";
import { answersMatch, cn, difficultyColor, formatTime } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";

type Mode = "practice" | "exam" | "mistakes" | "collection" | "favorites" | "session";

export function PracticeRunner({
  initialPool,
  mode,
  label,
  sessionId,
  onExit,
}: {
  initialPool: SATQuestion[];
  mode: Mode;
  label: string;
  sessionId: string;
  onExit: () => void;
}) {
  const [pool, setPool] = React.useState(initialPool);
  const [sid, setSid] = React.useState(sessionId);
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [graded, setGraded] = React.useState<GradedMap>({});
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [checking, setChecking] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");

  const isExam = mode === "exam";
  const current = pool[idx];
  const chosen = current ? answers[current.id] : undefined;
  const isGraded = current ? !!graded[current.id] : false;

  // elapsed timer (informational — no pressure timer)
  React.useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [done]);

  // notes
  React.useEffect(() => {
    setNoteDraft(current?.note ?? "");
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNote = React.useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (qid: string, note: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await apiPost("/api/notes", { questionId: qid, note });
        } catch (e) {
          toast.error("Couldn't save note", { description: e instanceof Error ? e.message : undefined });
        }
      }, 600);
    };
  }, []);

  const setAnswer = (value: string) => {
    if (!current) return;
    // In practice mode a graded question is locked — stats count the first
    // grade once. Use "Retry missed" (new session) to try again.
    if (!isExam && isGraded) return;
    setAnswers((a) => ({ ...a, [current.id]: value }));
  };

  /** Grade current question. Server dedupes by (session, question) so hammering
   *  "Check Answer" on the SAME question can never inflate counters. */
  const doCheck = async () => {
    if (!current || !chosen || chosen.trim() === "" || checking || isGraded) return;
    setChecking(true);
    const isCorrect = answersMatch(chosen, current.correctAnswer);
    try {
      const res = await apiPost<{ recorded: number; duplicates: number }>("/api/attempts", {
        sessionId: sid,
        mode,
        questionId: current.id,
        isCorrect,
        answer: chosen,
      });
      setGraded((g) => ({ ...g, [current.id]: { correct: isCorrect, answer: chosen } }));
      if (res.duplicates > 0)
        toast.info("This question was already graded", { description: "Your stats count it once per quiz." });
      mutateKey("stats");
      mutateKey("mistakes");
    } catch (e) {
      toast.error("Couldn't check your answer", { description: e instanceof Error ? e.message : "Please try again" });
    } finally {
      setChecking(false);
    }
  };

  /** Finish = grade EVERYTHING with an entered answer, even questions the user
   *  never pressed "Check" on. "Unanswered" therefore means literally nothing
   *  was entered — fixing the old all-unanswered results bug. */
  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      const pending = pool
        .filter((q) => answers[q.id] && answers[q.id].trim() !== "" && !graded[q.id])
        .map((q) => ({ questionId: q.id, isCorrect: answersMatch(answers[q.id], q.correctAnswer), answer: answers[q.id] }));
      let merged = { ...graded };
      if (pending.length > 0) {
        await apiPost("/api/attempts", { sessionId: sid, mode, attempts: pending });
        pending.forEach((p) => { merged[p.questionId] = { correct: p.isCorrect, answer: p.answer! }; });
        setGraded(merged);
      }
      const correctCount = pool.filter((q) => merged[q.id]?.correct).length;
      const answeredCount = pool.filter((q) => answers[q.id] && answers[q.id].trim() !== "").length;
      await apiPatch(`/api/sessions/${sid}`, { correctCount, answeredCount });
      mutateKey("stats");
      mutateKey("mistakes");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error("Couldn't finish the quiz", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setFinishing(false);
    }
  };

  const retryMissed = async () => {
    const missed = pool.filter((q) => answers[q.id] && !graded[q.id]?.correct);
    if (missed.length === 0) return;
    try {
      const res = await apiPost<{ id: string }>("/api/sessions", {
        mode, label: `Retry missed — ${label}`, totalQuestions: missed.length,
      });
      setPool(missed);
      setSid(res.id);
      setIdx(0); setAnswers({}); setGraded({}); setFlags({}); setDone(false); setElapsed(0);
    } catch (e) {
      toast.error("Couldn't start retry", { description: e instanceof Error ? e.message : undefined });
    }
  };

  // keyboard shortcuts
  React.useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA"].includes(tag)) return;
      if (!current) return;
      const k = e.key.toLowerCase();
      if (k === "n" || k === "arrowright") { e.preventDefault(); setIdx((i) => Math.min(pool.length - 1, i + 1)); }
      if (k === "p" || k === "arrowleft") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
      if (k === "f") { e.preventDefault(); setFlags((f) => ({ ...f, [current.id]: !f[current.id] })); }
      if (["a", "b", "c", "d"].includes(k) && current.choices?.some((c) => c.key.toLowerCase() === k)) {
        e.preventDefault();
        setAnswer(k.toUpperCase());
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (!isExam) doCheck();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // intentionally no dep array — always fresh closures

  if (done) {
    return (
      <QuizResults
        pool={pool}
        answers={answers}
        graded={graded}
        label={label}
        onRetryMissed={retryMissed}
        onNewQuiz={onExit}
      />
    );
  }

  if (!current) return null;
  const gradedCount = Object.keys(graded).length;
  const answeredCount = pool.filter((q) => answers[q.id] && answers[q.id].trim() !== "").length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-ghost !px-2.5" onClick={onExit} title="Exit quiz">
            <LogOut className="h-4 w-4" />
          </button>
          <div className="min-w-0 grow">
            <div className="flex items-center justify-between text-[12.5px] font-semibold text-[#8a8680]">
              <span className="truncate">{label}</span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Timer className="h-3.5 w-3.5" /> {formatTime(elapsed)}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full border border-[#e2dcc9] bg-[#efe9db]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7aa5f2] to-[#3a5fc8] transition-all duration-300"
                style={{ width: `${pool.length ? ((idx + 1) / pool.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-[13px] font-bold text-[#55524a]">
            {idx + 1}<span className="text-[#b0aa98]">/{pool.length}</span>
          </span>
        </div>

        {/* Question card */}
        <GlassCard hover={false} className="p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="badge badge-blue">{current.domain}</span>
            <span className="badge">{current.skill}</span>
            {current.subskill && <span className="badge hidden sm:inline-flex">{current.subskill}</span>}
            <span className={cn("badge border", difficultyColor(current.difficulty))}>{current.difficulty}</span>
            <div className="ml-auto flex items-center">
              <FavoriteButton questionId={current.id} favorite={current.favorite} />
              <AddToCollectionButton questionId={current.id} />
              <button
                onClick={() => setFlags((f) => ({ ...f, [current.id]: !f[current.id] }))}
                title={flags[current.id] ? "Unflag" : "Flag for review"}
                aria-label="Flag question"
                className="rounded-lg p-2 transition-colors hover:bg-[#f2ecdd]"
              >
                <Flag className={cn("h-[18px] w-[18px]", flags[current.id] ? "fill-[#ffb74a] stroke-[#d9922e]" : "stroke-[#a8a294]")} />
              </button>
              <button
                onClick={() => setNoteOpen((o) => !o)}
                title="Question note"
                aria-label="Question note"
                className="rounded-lg p-2 transition-colors hover:bg-[#f2ecdd]"
              >
                <NotebookPen className={cn("h-[18px] w-[18px]", noteOpen || current.note ? "stroke-[#3a5fc8]" : "stroke-[#a8a294]")} />
              </button>
            </div>
          </div>

          <QuestionView
            question={current}
            selected={chosen}
            onSelect={setAnswer}
            graded={isGraded}
            lockSelection={!isExam && isGraded}
            showExplanation={!isExam}
          />

          {noteOpen && (
            <div className="mt-4 rounded-2xl border border-[#f0e2b8] bg-[#fffdf2] p-4">
              <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wider text-[#a08b3c]">
                Your note for this question
              </label>
              <textarea
                className="input min-h-[80px] w-full resize-y bg-[#fffef8]"
                placeholder="Jot down what tripped you up…"
                value={noteDraft}
                onChange={(e) => {
                  setNoteDraft(e.target.value);
                  saveNote(current.id, e.target.value);
                }}
              />
            </div>
          )}

          {/* action bar */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[#f0ead9] pt-5">
            <button className="btn btn-soft" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {!isExam && (
              <button
                className="btn btn-primary"
                disabled={!chosen || chosen.trim() === "" || isGraded || checking}
                onClick={doCheck}
              >
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isGraded ? "Checked" : "Check Answer"}
              </button>
            )}
            {idx < pool.length - 1 ? (
              <button className="btn btn-soft" onClick={() => setIdx((i) => Math.min(pool.length - 1, i + 1))}>
                {chosen || isExam ? "Next" : "Skip"} <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button className="btn btn-good" onClick={finish} disabled={finishing}>
                {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
                Finish Quiz
              </button>
            )}
            <div className="ml-auto hidden items-center gap-3 text-[12px] font-medium text-[#8a8680] sm:flex">
              <span>{answeredCount} answered</span>
              {!isExam && <span>{gradedCount} checked</span>}
            </div>
          </div>
        </GlassCard>

        {idx < pool.length - 1 && (
          <div className="flex justify-end">
            <button className="btn btn-good" onClick={finish} disabled={finishing}>
              {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
              Finish Quiz now
            </button>
          </div>
        )}
      </div>

      {/* Navigator */}
      <GlassCard hover={false} className="h-fit p-4 lg:sticky lg:top-6">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a8680]">Navigator</p>
        <div className="grid grid-cols-8 gap-1.5 lg:grid-cols-5">
          {pool.map((q, i) => {
            const g = graded[q.id];
            const a = answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => setIdx(i)}
                className={cn(
                  "relative flex h-8 items-center justify-center rounded-lg border text-[11.5px] font-bold transition-all",
                  i === idx
                    ? "border-[#3a5fc8] bg-[#3a5fc8] text-white shadow-[0_2px_6px_rgba(58,95,200,0.4)]"
                    : g
                      ? g.correct
                        ? "border-[#bde5cf] bg-[#ecf8f1] text-[#238a5e]"
                        : "border-[#f3ccd4] bg-[#fdf0f2] text-[#a33046]"
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
        <div className="mt-3 space-y-1.5 border-t border-[#f0ead9] pt-3 text-[11px] text-[#8a8680]">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#3a5fc8]" /> Current</div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#eef2fd] ring-1 ring-[#c9d6f5]" /> Answered</div>
          {!isExam && (
            <>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#ecf8f1] ring-1 ring-[#bde5cf]" /> Correct</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#fdf0f2] ring-1 ring-[#f3ccd4]" /> Incorrect</div>
            </>
          )}
          <div className="pt-1 text-[10.5px] leading-relaxed">
            Shortcuts: A–D select · Space check · ←/→ move · F flag
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
