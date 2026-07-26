"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Play, Loader2, FlaskConical, PenLine, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperSelect } from "@/components/ui/paper-select";
import { PaperSlider } from "@/components/ui/paper-slider";
import { PracticeRunner } from "@/components/quiz/practice-runner";
import { useSettings } from "@/components/settings-provider";
import { BluebookRunner } from "@/components/quiz/bluebook-runner";
import { apiGet, apiPost } from "@/lib/api-client";
import { clearPool, readPool } from "@/lib/quiz-session";
import { skillsForDomain, subskillsFor } from "@/lib/sat-categories";
import { cn, skillTone } from "@/lib/utils";
import type { PracticeTestDetail, QuestionSummary, SATQuestion } from "@/lib/types";

const DOMAIN_OPTS = [
  { value: "All", label: "All sections", tone: "lavender" as const },
  { value: "Math", label: "Math", tone: "teal" as const },
  { value: "Reading & Writing", label: "Reading & Writing", tone: "lavender" as const },
];

type Phase =
  | { kind: "setup" }
  | { kind: "practice"; pool: SATQuestion[]; sessionId: string; label: string; mode: string }
  | { kind: "bluebook"; test: PracticeTestDetail; sessionId: string };

function QuizInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { settings, ready: settingsReady } = useSettings();
  const defaultsApplied = React.useRef(false);
  const [phase, setPhase] = React.useState<Phase>({ kind: "setup" });
  const [booting, setBooting] = React.useState(false);
  const [handoffError, setHandoffError] = React.useState<string | null>(null);
  const [handoffAttempt, setHandoffAttempt] = React.useState(0);
  const handoffStarted = React.useRef(false);

  // setup state
  const [domain, setDomain] = React.useState("All");
  const [skill, setSkill] = React.useState("All");
  const [subskill, setSubskill] = React.useState("All");
  const [difficulty, setDifficulty] = React.useState("All");
  const [count, setCount] = React.useState(10);
  const [quizMode, setQuizMode] = React.useState<"practice" | "exam">("practice");
  const [available, setAvailable] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!settingsReady || defaultsApplied.current) return;
    defaultsApplied.current = true;
    setCount(settings.defaultQuizSize);
    setQuizMode(settings.defaultQuizMode);
  }, [settings, settingsReady]);

  const skillOpts = React.useMemo(
    () => [
      { value: "All", label: "All domains", tone: "blue" as const },
      ...skillsForDomain(domain).map((item) => ({ value: item, label: item, tone: skillTone(item) })),
    ],
    [domain],
  );
  const subskillOpts = React.useMemo(
    () => [
      { value: "All", label: "All skills", tone: "green" as const },
      ...subskillsFor(domain, skill).map((item) => ({ value: item, label: item, tone: "green" as const })),
    ],
    [domain, skill],
  );

  const filterQS = React.useMemo(() => {
    const p = new URLSearchParams();
    if (domain !== "All") p.set("domain", domain);
    if (skill !== "All") p.set("skill", skill);
    if (subskill !== "All") p.set("subskill", subskill);
    if (difficulty !== "All") p.set("difficulty", difficulty);
    return p.toString();
  }, [domain, skill, subskill, difficulty]);

  // live "N questions match" counter
  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const d = await apiGet<QuestionSummary>(`/api/questions?${filterQS}&pageSize=1`);
        if (alive) setAvailable(d.total);
      } catch {
        if (alive) setAvailable(null);
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [filterQS]);

  // Handoff from Question Bank, Mistakes, Collections, or a practice test.
  // The ref prevents React Strict Mode from consuming/starting the same pool twice.
  React.useEffect(() => {
    const poolParam = sp.get("pool");
    const testParam = sp.get("test");
    if ((!poolParam && !testParam) || handoffStarted.current) return;
    handoffStarted.current = true;

    (async () => {
      setBooting(true);
      setHandoffError(null);
      try {
        if (testParam) {
          const test = await apiGet<PracticeTestDetail>(`/api/practice-tests/${testParam}`);
          const session = await apiPost<{ id: string }>("/api/sessions", {
            mode: "bluebook",
            label: test.title,
            testId: test.id,
            totalQuestions: test.totalQuestions,
          });
          setPhase({ kind: "bluebook", test, sessionId: session.id });
          router.replace("/quiz", { scroll: false });
          return;
        }

        const launch = readPool();
        if (!launch) throw new Error("The selected question set is no longer available. Return to the source page and select it again.");

        // Load the exact IDs before creating the session. If loading fails, the
        // stored pool remains intact and the user gets a real retry action.
        const loaded = await apiPost<QuestionSummary>("/api/questions", { ids: launch.ids });
        if (loaded.questions.length !== launch.ids.length) {
          throw new Error(`Loaded ${loaded.questions.length} of ${launch.ids.length} selected questions.`);
        }
        const session = await apiPost<{ id: string }>("/api/sessions", {
          mode: launch.mode ?? "practice",
          label: launch.label,
          totalQuestions: loaded.questions.length,
        });
        clearPool();
        setPhase({
          kind: "practice",
          pool: loaded.questions,
          sessionId: session.id,
          label: launch.label,
          mode: launch.mode ?? "practice",
        });
        router.replace("/quiz", { scroll: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load that question set.";
        setHandoffError(message);
        toast.error("Could not start the selected quiz", { description: message });
      } finally {
        setBooting(false);
      }
    })();
  }, [sp, router, handoffAttempt]);

  const retryHandoff = () => {
    handoffStarted.current = false;
    setHandoffAttempt((attempt) => attempt + 1);
  };

  const startCustom = async () => {
    if (booting) return;
    setBooting(true);
    try {
      const labelParts = [
        domain !== "All" ? domain : "All domains",
        skill !== "All" ? skill : null,
        difficulty !== "All" ? difficulty : null,
      ].filter(Boolean);
      const label = `${quizMode === "exam" ? "Exam" : "Practice"} · ${labelParts.join(" · ")}`;
      const d = await apiGet<QuestionSummary>(`/api/questions?${filterQS}&random=1&limit=${count}`);
      if (d.questions.length === 0) {
        toast.error("No questions match those filters. Widen them and try again.");
        return;
      }
      const s = await apiPost<{ id: string }>("/api/sessions", {
        mode: quizMode, label, totalQuestions: d.questions.length,
      });
      setPhase({ kind: "practice", pool: d.questions, sessionId: s.id, label, mode: quizMode });
    } catch (e) {
      toast.error("Couldn't start the quiz", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBooting(false);
    }
  };

  if (phase.kind === "practice") {
    return (
      <PracticeRunner
        key={phase.sessionId}
        initialPool={phase.pool}
        sessionId={phase.sessionId}
        label={phase.label}
        mode={phase.mode as "practice"}
        onExit={() => setPhase({ kind: "setup" })}
      />
    );
  }
  if (phase.kind === "bluebook") {
    return (
      <BluebookRunner
        key={phase.sessionId}
        test={phase.test}
        sessionId={phase.sessionId}
        onExit={() => setPhase({ kind: "setup" })}
      />
    );
  }

  if (sp.get("pool") || sp.get("test")) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <GlassCard hover={false} className="p-7 text-center">
          {handoffError ? (
            <>
              <AlertCircle className="mx-auto h-9 w-9 text-[var(--bad)]" />
              <h1 className="font-display mt-3 text-2xl font-bold text-[var(--ink)]">Could not load that quiz</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{handoffError}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn btn-primary" onClick={retryHandoff}>
                  <RotateCcw className="h-4 w-4" /> Try again
                </button>
                <button type="button" className="btn btn-soft" onClick={() => router.push("/bank")}>
                  <ArrowLeft className="h-4 w-4" /> Back to question bank
                </button>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--accent)]" />
              <h1 className="font-display mt-3 text-2xl font-bold text-[var(--ink)]">Loading your exact questions</h1>
              <p className="mt-1 text-[13px] text-[var(--ink-faint)]">
                {booting ? "Preparing the selected set…" : "Starting…"}
              </p>
            </>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
          Practice <span className="hl-blue px-1">Quiz</span>
        </h1>
        <p className="mt-1 text-[15px] text-[var(--ink-faint)]">
          Build a custom drill from all 3,444 official College Board questions.
        </p>
      </div>

      <GlassCard hover={false} className="p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#6e5d7b]">Section</label>
            <PaperSelect
              tone="lavender"
              value={domain}
              onValueChange={(v) => { setDomain(v); setSkill("All"); setSubskill("All"); }}
              options={DOMAIN_OPTS}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#245d73]">Domain</label>
            <PaperSelect
              tone="blue"
              value={skill}
              onValueChange={(v) => { setSkill(v); setSubskill("All"); }}
              options={skillOpts}
              disabled={domain === "All"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#477b5c]">Skill</label>
            <PaperSelect
              tone="green"
              value={subskill}
              onValueChange={setSubskill}
              options={subskillOpts}
              disabled={skill === "All"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#8b622f]">Difficulty</label>
            <PaperSelect
              tone="yellow"
              value={difficulty}
              onValueChange={setDifficulty}
              options={[
                { value: "All", label: "All difficulties", tone: "yellow" },
                { value: "Easy", label: "Easy", tone: "green" },
                { value: "Medium", label: "Medium", tone: "yellow" },
                { value: "Hard", label: "Hard", tone: "rose" },
              ]}
            />
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Questions</label>
            <span className="font-display text-2xl font-bold text-[#3a5fc8]">{count}</span>
          </div>
          <PaperSlider
            value={count}
            onValueChange={setCount}
            min={5}
            max={40}
            step={5}
            ticks={[5, 10, 15, 20, 25, 30, 35, 40]}
            formatValue={(v) => `${v}`}
            ariaLabel="Number of questions"
          />
          {available != null && (
            <p className={cn("mt-1 text-[12.5px] font-medium", available === 0 ? "text-[#a33046]" : "text-[var(--ink-faint)]")}>
              {available.toLocaleString()} question{available === 1 ? "" : "s"} match your filters
              {available > 0 && available < count ? `. The quiz will use all ${available}.` : ""}
            </p>
          )}
        </div>

        <div className="mt-7">
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Mode</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setQuizMode("practice")}
              className={cn(
                "flex items-start gap-3 rounded-[6px] border p-4 text-left transition-colors",
                quizMode === "practice"
                  ? "border-[#3a5fc8] bg-[#eef2fd] shadow-[0_0_0_3px_rgba(58,95,200,0.10)]"
                  : "border-[var(--line-soft)] bg-white hover:border-[#cfc5ae]",
              )}
            >
              <FlaskConical className={cn("mt-0.5 h-5 w-5", quizMode === "practice" ? "text-[#3a5fc8]" : "text-[var(--ink-faint)]")} />
              <span>
                <span className="block text-[14px] font-bold text-[var(--ink)]">Practice</span>
                <span className="block text-[12px] text-[var(--ink-faint)]">Check answers as you go with explanations</span>
              </span>
            </button>
            <button
              onClick={() => setQuizMode("exam")}
              className={cn(
                "flex items-start gap-3 rounded-[6px] border p-4 text-left transition-colors",
                quizMode === "exam"
                  ? "border-[#3a5fc8] bg-[#eef2fd] shadow-[0_0_0_3px_rgba(58,95,200,0.10)]"
                  : "border-[var(--line-soft)] bg-white hover:border-[#cfc5ae]",
              )}
            >
              <PenLine className={cn("mt-0.5 h-5 w-5", quizMode === "exam" ? "text-[#3a5fc8]" : "text-[var(--ink-faint)]")} />
              <span>
                <span className="block text-[14px] font-bold text-[var(--ink)]">Exam</span>
                <span className="block text-[12px] text-[var(--ink-faint)]">No feedback until you finish; graded at the end</span>
              </span>
            </button>
          </div>
        </div>

        <button className="btn btn-primary mt-7 w-full !py-3.5 !text-[15px]" onClick={startCustom} disabled={booting || available === 0}>
          {booting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
          {booting ? "Preparing your quiz…" : `Start ${quizMode === "exam" ? "exam" : "quiz"}`}
        </button>
      </GlassCard>
    </div>
  );
}

export default function QuizPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-24 text-[var(--ink-faint)]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading quiz…
        </div>
      }
    >
      <QuizInner />
    </React.Suspense>
  );
}
