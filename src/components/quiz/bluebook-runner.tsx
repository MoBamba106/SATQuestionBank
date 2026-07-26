"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  BookOpenCheck,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Flag,
  GitBranch,
  Loader2,
  PauseCircle,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { QuestionView } from "@/components/quiz/question-view";
import { FloatingDesmos } from "@/components/quiz/floating-desmos";
import { SkillBands } from "@/components/quiz/skill-bands";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { apiPatch, apiPost, mutateKey } from "@/lib/api-client";
import { scoreModule } from "@/lib/adaptive";
import { estimateSatScore } from "@/lib/sat-score";
import { removeBluebookProgress, saveBluebookProgress, type BluebookProgress } from "@/lib/bluebook-cache";
import { answersMatch, cn, difficultyColor, domainColor, formatTime, skillColor } from "@/lib/utils";
import type { AdaptivePath, AdaptiveRoute, PracticeTestDetail, SATQuestion } from "@/lib/types";

type Stage = 0 | 1 | 2 | 3;
type ActiveModule = {
  title: string;
  section: "Reading & Writing" | "Math";
  number: 1 | 2;
  questions: SATQuestion[];
};

function activeModule(
  test: PracticeTestDetail,
  stage: Stage,
  rwRoute: AdaptiveRoute | null,
  mathRoute: AdaptiveRoute | null,
): ActiveModule {
  if (stage === 0) {
    return { title: "Reading & Writing · Module 1", section: "Reading & Writing", number: 1, questions: test.modules.rw1 };
  }
  if (stage === 1) {
    return {
      title: "Reading & Writing · Module 2",
      section: "Reading & Writing",
      number: 2,
      questions: rwRoute === "harder" ? test.modules.rw2Hard : test.modules.rw2Easy,
    };
  }
  if (stage === 2) {
    return { title: "Math · Module 1", section: "Math", number: 1, questions: test.modules.math1 };
  }
  return {
    title: "Math · Module 2",
    section: "Math",
    number: 2,
    questions: mathRoute === "harder" ? test.modules.math2Hard : test.modules.math2Easy,
  };
}

export function BluebookRunner({
  test,
  sessionId,
  resume,
  onExit,
}: {
  test: PracticeTestDetail;
  sessionId: string;
  resume?: BluebookProgress | null;
  onExit: () => void;
}) {
  const router = useRouter();
  const [stage, setStage] = React.useState<Stage>(resume?.stage ?? 0);
  const [rwRoute, setRwRoute] = React.useState<AdaptiveRoute | null>(resume?.rwRoute ?? null);
  const [mathRoute, setMathRoute] = React.useState<AdaptiveRoute | null>(resume?.mathRoute ?? null);
  const [rwRoutingScore, setRwRoutingScore] = React.useState<{ correct: number; total: number } | null>(resume?.rwRoutingScore ?? null);
  const [mathRoutingScore, setMathRoutingScore] = React.useState<{ correct: number; total: number } | null>(resume?.mathRoutingScore ?? null);
  const [qIdx, setQIdx] = React.useState(resume?.questionIndex ?? 0);
  const [answers, setAnswers] = React.useState<Record<string, string>>(resume?.answers ?? {});
  const [flags, setFlags] = React.useState<Record<string, boolean>>(resume?.flags ?? {});
  const [secondsLeft, setSecondsLeft] = React.useState(resume?.secondsLeft ?? Math.round(test.rwMinutes / 2) * 60);
  const [confirmEnd, setConfirmEnd] = React.useState(false);
  const [desmosOpen, setDesmosOpen] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [graded, setGraded] = React.useState<Record<string, { correct: boolean; answer: string }>>({});

  const mod = React.useMemo(
    () => activeModule(test, stage, rwRoute, mathRoute),
    [test, stage, rwRoute, mathRoute],
  );
  const current = mod.questions[qIdx];
  const chosen = current ? answers[current.id] : undefined;
  const isLastModule = stage === 3;
  const lowTime = secondsLeft <= 300;

  const progressSnapshot = React.useCallback((): BluebookProgress => ({
    version: 1,
    testId: test.id,
    sessionId,
    stage,
    questionIndex: qIdx,
    answers,
    flags,
    secondsLeft,
    rwRoute,
    mathRoute,
    rwRoutingScore,
    mathRoutingScore,
    updatedAt: new Date().toISOString(),
  }), [answers, flags, mathRoute, mathRoutingScore, qIdx, rwRoute, rwRoutingScore, secondsLeft, sessionId, stage, test.id]);

  React.useEffect(() => {
    if (!done) saveBluebookProgress(progressSnapshot());
  }, [done, progressSnapshot]);

  const pauseAndExit = () => {
    saveBluebookProgress(progressSnapshot());
    onExit();
  };

  React.useEffect(() => {
    if (done) return;
    const timer = setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          clearInterval(timer);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [done, stage]);

  const takenModules = React.useCallback((path: AdaptivePath) => [
    test.modules.rw1,
    path.rw === "harder" ? test.modules.rw2Hard : test.modules.rw2Easy,
    test.modules.math1,
    path.math === "harder" ? test.modules.math2Hard : test.modules.math2Easy,
  ], [test]);

  const finishTest = React.useCallback(async () => {
    if (finishing || done || !rwRoute || !mathRoute) return;
    setFinishing(true);
    try {
      const adaptivePath: AdaptivePath = { rw: rwRoute, math: mathRoute };
      const [rw1, rw2, math1, math2] = takenModules(adaptivePath);
      const all = [...rw1, ...rw2, ...math1, ...math2];
      const attempts = all
        .filter((question) => answers[question.id]?.trim())
        .map((question) => ({
          questionId: question.id,
          isCorrect: answersMatch(answers[question.id], question.correctAnswer),
          answer: answers[question.id],
        }));
      if (attempts.length > 0) {
        await apiPost("/api/attempts", { sessionId, mode: "bluebook", attempts });
      }
      const gradeMap: Record<string, { correct: boolean; answer: string }> = {};
      attempts.forEach((attempt) => {
        gradeMap[attempt.questionId] = { correct: attempt.isCorrect, answer: attempt.answer };
      });
      setGraded(gradeMap);
      const score = estimateSatScore({ rw1, rw2, math1, math2, grades: gradeMap, path: adaptivePath });
      await apiPatch(`/api/sessions/${sessionId}`, {
        correctCount: attempts.filter((attempt) => attempt.isCorrect).length,
        answeredCount: attempts.length,
        adaptivePath,
        ...score,
        finish: true,
      });
      mutateKey("stats");
      mutateKey("mistakes");
      removeBluebookProgress(test.id);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error("Could not submit the test", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setFinishing(false);
    }
  }, [answers, done, finishing, mathRoute, rwRoute, sessionId, takenModules, test.id]);

  const advance = React.useCallback(() => {
    if (stage === 0) {
      const score = scoreModule(test.modules.rw1, answers);
      setRwRoute(score.route);
      setRwRoutingScore({ correct: score.correct, total: score.total });
      setStage(1);
      setSecondsLeft(Math.round(test.rwMinutes / 2) * 60);
    } else if (stage === 1) {
      setStage(2);
      setSecondsLeft(Math.round(test.mathMinutes / 2) * 60);
    } else if (stage === 2) {
      const score = scoreModule(test.modules.math1, answers);
      setMathRoute(score.route);
      setMathRoutingScore({ correct: score.correct, total: score.total });
      setStage(3);
      setSecondsLeft(Math.round(test.mathMinutes / 2) * 60);
    } else {
      void finishTest();
      return;
    }
    setQIdx(0);
    setConfirmEnd(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [answers, finishTest, stage, test]);

  const advanceRef = React.useRef(advance);
  React.useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);
  React.useEffect(() => {
    if (secondsLeft === 0 && !done) advanceRef.current();
  }, [secondsLeft, done]);

  if (done && rwRoute && mathRoute) {
    const path: AdaptivePath = { rw: rwRoute, math: mathRoute };
    const modules = takenModules(path);
    const rwQuestions = [...modules[0], ...modules[1]];
    const mathQuestions = [...modules[2], ...modules[3]];
    const rwCorrect = rwQuestions.filter((question) => graded[question.id]?.correct).length;
    const mathCorrect = mathQuestions.filter((question) => graded[question.id]?.correct).length;
    const totalCorrect = rwCorrect + mathCorrect;
    const total = rwQuestions.length + mathQuestions.length;
    const score = estimateSatScore({
      rw1: modules[0], rw2: modules[1], math1: modules[2], math2: modules[3], grades: graded, path,
    });

    return (
      <GlassCard hover={false} className="p-6 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[7px] border border-[#acc7d0] bg-[#dce8ed]">
            <BookOpenCheck className="h-7 w-7 text-[#286983]" />
          </div>
          <h2 className="font-display mt-4 text-3xl font-bold text-[var(--ink)]">{test.title} submitted</h2>
          <p className="mt-1 text-[15px] text-[var(--ink-faint)]">Your adaptive route and full review are ready.</p>
          <div className="mt-5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-soft)] px-8 py-5">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--ink-faint)]">Estimated SAT score</div>
            <div className="font-display mt-1 text-5xl font-bold text-[var(--ink)]">{score.totalScore}</div>
            <div className="mt-1 text-[11px] text-[var(--ink-faint)]">Practice estimate on the 400–1600 scale · raw {totalCorrect}/{total}</div>
          </div>

          <div className="mt-5 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
            <div className="soft-tone soft-tone-lavender p-4 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold uppercase tracking-wide">Reading & Writing</span>
                <span className="badge bg-white/50">{rwRoute} Module 2</span>
              </div>
              <div className="font-display mt-2 text-3xl font-bold">{score.rwScore}</div>
              <div className="text-[11px]">{rwCorrect}/{rwQuestions.length} correct</div>
              <div className="mt-1 text-[11.5px]">Routing module: {rwRoutingScore?.correct ?? 0}/{rwRoutingScore?.total ?? test.modules.rw1.length}</div>
            </div>
            <div className="soft-tone soft-tone-teal p-4 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold uppercase tracking-wide">Math</span>
                <span className="badge bg-white/50">{mathRoute} Module 2</span>
              </div>
              <div className="font-display mt-2 text-3xl font-bold">{score.mathScore}</div>
              <div className="text-[11px]">{mathCorrect}/{mathQuestions.length} correct</div>
              <div className="mt-1 text-[11.5px]">Routing module: {mathRoutingScore?.correct ?? 0}/{mathRoutingScore?.total ?? test.modules.math1.length}</div>
            </div>
          </div>

          <div className="mt-6 w-full max-w-3xl text-left">
            <h3 className="font-display mb-3 text-xl font-bold text-[var(--ink)]">Knowledge and skills</h3>
            <SkillBands bands={score.skillBands} />
            <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
              These five-bar bands and section scores are practice estimates. Official digital SAT scores use College Board&apos;s equating and item-response model.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="btn btn-primary" href={`/bluebook/review?session=${sessionId}`}>
              Open full review
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
        <GlassCard hover={false} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <button className="btn btn-ghost !px-2" onClick={pauseAndExit} title="Pause and exit test" aria-label="Pause and exit test"><PauseCircle className="h-4 w-4" /></button>
          <div className="min-w-0 grow">
            <div className="truncate text-[13px] font-bold text-[var(--ink)]">{test.title}</div>
            <div className="text-[11.5px] font-medium text-[var(--ink-faint)]">
              {mod.title} · Question {qIdx + 1} of {mod.questions.length}
            </div>
          </div>
          {current.domain === "Math" && (
            <button type="button" className="btn btn-soft !min-h-8 !px-2.5 !py-1.5 !text-[12px]" onClick={() => setDesmosOpen(true)}>
              <Calculator className="h-3.5 w-3.5" /> Desmos
            </button>
          )}
          {mod.number === 2 && (
            <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#c9b9d1] bg-[#e9e1ec] px-2.5 py-1 text-[10.5px] font-bold text-[#6e5d7b]">
              <GitBranch className="h-3.5 w-3.5" /> Adaptive module
            </span>
          )}
          <div className={cn(
            "inline-flex items-center gap-2 rounded-[6px] border px-3.5 py-2 font-mono text-[15px] font-bold",
            lowTime ? "border-[#d2abb7] bg-[#f0dfe5] text-[#8e5264]" : "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]",
          )}>
            <AlarmClock className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </div>
        </GlassCard>

        <GlassCard hover={false} className="p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={cn("badge", domainColor(current.domain))}>{current.domain}</span>
            <span className={cn("badge", skillColor(current.skill))}>{current.skill}</span>
            <span className={cn("badge border", difficultyColor(current.difficulty))}>{current.difficulty}</span>
            <div className="ml-auto">
              <button
                onClick={() => setFlags((flagsById) => ({ ...flagsById, [current.id]: !flagsById[current.id] }))}
                title={flags[current.id] ? "Unflag" : "Flag for review"}
                aria-label="Flag question"
                className="rounded-[5px] p-2 transition-colors hover:bg-[var(--paper-soft)]"
              >
                <Flag className={cn("h-[18px] w-[18px]", flags[current.id] ? "fill-[#d19548] stroke-[#9b6a31]" : "stroke-[var(--ink-faint)]")} />
              </button>
            </div>
          </div>

          <QuestionView
            question={current}
            selected={chosen}
            onSelect={(value) => setAnswers((currentAnswers) => ({ ...currentAnswers, [current.id]: value }))}
            graded={false}
            lockSelection={false}
            showExplanation={false}
          />

          <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[var(--line-soft)] pt-5">
            <button className="btn btn-soft" disabled={qIdx === 0} onClick={() => setQIdx((index) => Math.max(0, index - 1))}>
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {qIdx < mod.questions.length - 1 ? (
              <button className="btn btn-soft" onClick={() => setQIdx((index) => Math.min(mod.questions.length - 1, index + 1))}>
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

      <GlassCard hover={false} className="h-fit p-4 lg:sticky lg:top-6">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{mod.title}</p>
        <div className="grid grid-cols-9 gap-1.5 lg:grid-cols-6">
          {mod.questions.map((question, index) => {
            const answer = answers[question.id];
            return (
              <button
                key={question.id}
                onClick={() => setQIdx(index)}
                className={cn(
                  "relative flex h-8 items-center justify-center rounded-[5px] border text-[11.5px] font-bold transition-colors",
                  index === qIdx
                    ? "border-[#286983] bg-[#286983] text-white"
                    : answer?.trim()
                      ? "border-[#acc7d0] bg-[#dce8ed] text-[#245d73]"
                      : "border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink-faint)] hover:border-[#9a85ae]",
                )}
              >
                {index + 1}
                {flags[question.id] && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#d19548] ring-2 ring-[var(--paper-raised)]" />}
              </button>
            );
          })}
        </div>
        <button className="btn btn-soft mt-4 w-full !py-2 text-[12.5px]" onClick={() => setConfirmEnd(true)}>
          {isLastModule ? "Submit test" : "End module early"}
        </button>
        <div className="mt-3 border-t border-[var(--line-soft)] pt-3 text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
          Module {stage + 1} of 4. Module 1 performance chooses the easier or harder Module 2 for each section.
        </div>
      </GlassCard>

      <FloatingDesmos open={desmosOpen && current.domain === "Math"} onClose={() => setDesmosOpen(false)} />

      <PaperDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title={isLastModule ? "Submit the test?" : `End ${mod.title}?`}
        description="You cannot return to a completed module. Your Module 1 score determines the next module's difficulty."
      >
        <div className="soft-tone soft-tone-yellow mt-3 px-4 py-3 text-[13px]">
          {mod.questions.filter((question) => !answers[question.id]?.trim()).length} question(s) in this module still have no answer.
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
