"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Play, Loader2, FlaskConical, PenLine } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { PaperSelect } from "@/components/ui/paper-select";
import { PaperSlider } from "@/components/ui/paper-slider";
import { PracticeRunner } from "@/components/quiz/practice-runner";
import { BluebookRunner } from "@/components/quiz/bluebook-runner";
import { apiGet, apiPost } from "@/lib/api-client";
import { consumePool } from "@/lib/quiz-session";
import { skillsForDomain, subskillsFor } from "@/lib/sat-categories";
import { cn } from "@/lib/utils";
import type { PracticeTestDetail, QuestionSummary, SATQuestion } from "@/lib/types";

const DOMAIN_OPTS = [
  { value: "All", label: "All domains" },
  { value: "Math", label: "Math" },
  { value: "Reading & Writing", label: "Reading & Writing" },
];

type Phase =
  | { kind: "setup" }
  | { kind: "practice"; pool: SATQuestion[]; sessionId: string; label: string; mode: string }
  | { kind: "bluebook"; test: PracticeTestDetail; sessionId: string };

function QuizInner() {
  const sp = useSearchParams();
  const [phase, setPhase] = React.useState<Phase>({ kind: "setup" });
  const [booting, setBooting] = React.useState(false);

  // setup state
  const [domain, setDomain] = React.useState("All");
  const [skill, setSkill] = React.useState("All");
  const [subskill, setSubskill] = React.useState("All");
  const [difficulty, setDifficulty] = React.useState("All");
  const [count, setCount] = React.useState(10);
  const [quizMode, setQuizMode] = React.useState<"practice" | "exam">("practice");
  const [available, setAvailable] = React.useState<number | null>(null);

  const skillOpts = React.useMemo(
    () => [{ value: "All", label: "All categories" }, ...skillsForDomain(domain).map((s) => ({ value: s, label: s }))],
    [domain],
  );
  const subskillOpts = React.useMemo(
    () => [{ value: "All", label: "All skills" }, ...subskillsFor(domain, skill).map((s) => ({ value: s, label: s }))],
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

  // handoff: ?pool=1 (mistakes / collections / favorites) or ?test=test-N
  React.useEffect(() => {
    const poolParam = sp.get("pool");
    const testParam = sp.get("test");
    if (!poolParam && !testParam) return;

    (async () => {
      setBooting(true);
      try {
        if (testParam) {
          const test = await apiGet<PracticeTestDetail>(`/api/practice-tests/${testParam}`);
          const s = await apiPost<{ id: string }>("/api/sessions", {
            mode: "bluebook", label: test.title, testId: test.id, totalQuestions: test.totalQuestions,
          });
          setPhase({ kind: "bluebook", test, sessionId: s.id });
          return;
        }
        const launch = consumePool();
        if (!launch) {
          toast.error("That question pool expired — build it again from its page.");
          return;
        }
        const s = await apiPost<{ id: string }>("/api/sessions", {
          mode: launch.mode ?? "practice", label: launch.label, totalQuestions: launch.ids.length,
        });
        const d = await apiPost<QuestionSummary>("/api/questions", { ids: launch.ids });
        if (d.questions.length === 0) {
          toast.error("None of those questions could be loaded.");
          return;
        }
        setPhase({ kind: "practice", pool: d.questions, sessionId: s.id, label: launch.label, mode: launch.mode ?? "practice" });
      } catch (e) {
        toast.error("Couldn't start the quiz", { description: e instanceof Error ? e.message : undefined });
      } finally {
        setBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

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
        toast.error("No questions match those filters — widen them and try again.");
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

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#2b2b2a]">
          Practice <span className="hl-blue px-1">Quiz</span>
        </h1>
        <p className="mt-1 text-[15px] text-[#8a8680]">
          Build a custom drill from all 3,444 official College Board questions.
        </p>
      </div>

      <GlassCard hover={false} className="p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">Domain</label>
            <PaperSelect
              value={domain}
              onValueChange={(v) => { setDomain(v); setSkill("All"); setSubskill("All"); }}
              options={DOMAIN_OPTS}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">Category</label>
            <PaperSelect
              value={skill}
              onValueChange={(v) => { setSkill(v); setSubskill("All"); }}
              options={skillOpts}
              disabled={domain === "All"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">Skill</label>
            <PaperSelect
              value={subskill}
              onValueChange={setSubskill}
              options={subskillOpts}
              disabled={skill === "All"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">Difficulty</label>
            <PaperSelect
              value={difficulty}
              onValueChange={setDifficulty}
              options={[
                { value: "All", label: "All difficulties" },
                { value: "Easy", label: "Easy" },
                { value: "Medium", label: "Medium" },
                { value: "Hard", label: "Hard" },
              ]}
            />
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">Questions</label>
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
            <p className={cn("mt-1 text-[12.5px] font-medium", available === 0 ? "text-[#a33046]" : "text-[#8a8680]")}>
              {available.toLocaleString()} question{available === 1 ? "" : "s"} match your filters
              {available > 0 && available < count ? ` — quiz will use all ${available}` : ""}
            </p>
          )}
        </div>

        <div className="mt-7">
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[#8a8680]">Mode</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setQuizMode("practice")}
              className={cn(
                "flex items-start gap-3 rounded-2xl border-[1.5px] p-4 text-left transition-all",
                quizMode === "practice"
                  ? "border-[#3a5fc8] bg-[#eef2fd] shadow-[0_0_0_3px_rgba(58,95,200,0.10)]"
                  : "border-[#e7e0d0] bg-white hover:border-[#cfc5ae]",
              )}
            >
              <FlaskConical className={cn("mt-0.5 h-5 w-5", quizMode === "practice" ? "text-[#3a5fc8]" : "text-[#a8a294]")} />
              <span>
                <span className="block text-[14px] font-bold text-[#2b2b2a]">Practice</span>
                <span className="block text-[12px] text-[#8a8680]">Check answers as you go with explanations</span>
              </span>
            </button>
            <button
              onClick={() => setQuizMode("exam")}
              className={cn(
                "flex items-start gap-3 rounded-2xl border-[1.5px] p-4 text-left transition-all",
                quizMode === "exam"
                  ? "border-[#3a5fc8] bg-[#eef2fd] shadow-[0_0_0_3px_rgba(58,95,200,0.10)]"
                  : "border-[#e7e0d0] bg-white hover:border-[#cfc5ae]",
              )}
            >
              <PenLine className={cn("mt-0.5 h-5 w-5", quizMode === "exam" ? "text-[#3a5fc8]" : "text-[#a8a294]")} />
              <span>
                <span className="block text-[14px] font-bold text-[#2b2b2a]">Exam</span>
                <span className="block text-[12px] text-[#8a8680]">No feedback until you finish — graded at the end</span>
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
        <div className="flex items-center justify-center gap-2 py-24 text-[#8a8680]">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading quiz…
        </div>
      }
    >
      <QuizInner />
    </React.Suspense>
  );
}
