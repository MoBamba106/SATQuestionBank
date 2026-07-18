"use client";
import { useBank } from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { SATQuestion } from "@/lib/types";
import { Calculator, Flag, ChevronLeft, ChevronRight, CheckCircle, RotateCcw, X, Play, Star, NotebookPen, Timer } from "lucide-react";
import { InlineMath } from "react-katex";
import { MATH_SUBSKILLS, RW_SUBSKILLS } from "@/lib/sat-categories";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { SafeHtml } from "@/components/ui/safe-html";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function QuizPage() {
  const {
    questions,
    attempts,
    recordAttempt,
    customQuizPool,
    setCustomQuizPool,
    questionNotes,
    setQuestionNote,
    toggleFavorite,
  } = useBank();

  const [domain, setDomain] = useState<string>("All");
  const [skill, setSkill] = useState<string>("All");
  const [diff, setDiff] = useState("All");
  const [count, setCount] = useState(10);
  const [started, setStarted] = useState(false);
  const [pool, setPool] = useState<SATQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [checked, setChecked] = useState<Record<string,boolean>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string,string>>({});
  const [checkAttempts, setCheckAttempts] = useState<Record<string,number>>({});
  const [flags, setFlags] = useState<Record<string,boolean>>({});
  const [showDesmos, setShowDesmos] = useState(true);
  const [dHeight, setDHeight] = useState(420);
  const [showResults, setShowResults] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [moduleSeconds, setModuleSeconds] = useState(32 * 60);
  const [moduleNumber, setModuleNumber] = useState(1);

  const skillOptions = useMemo(() => {
    if (domain === "Math") return ["All", ...Object.keys(MATH_SUBSKILLS)];
    if (domain === "Reading & Writing") return ["All", ...Object.keys(RW_SUBSKILLS)];
    return ["All"];
  }, [domain]);

  const subskillOptions = useMemo(() => {
    if (skill === "All" || domain === "All") return [];
    if (domain === "Math") return MATH_SUBSKILLS[skill] || [];
    return RW_SUBSKILLS[skill] || [];
  }, [domain, skill]);

  const [subskill, setSubskill] = useState<string>("All");

  const filteredPool = useMemo(() => questions.filter(q =>
    (domain === "All" || q.domain === domain) &&
    (skill === "All" || q.skill === skill) &&
    (subskill === "All" || q.subskill === subskill) &&
    (diff === "All" || q.difficulty === diff)
  ), [questions, domain, skill, subskill, diff]);

  const customQuestions = useMemo(() => {
    if (!customQuizPool || customQuizPool.length === 0) return null;
    return questions.filter(q => customQuizPool.includes(q.id));
  }, [customQuizPool, questions]);

  const effectivePool = customQuestions && customQuestions.length > 0 ? customQuestions : filteredPool;

  useEffect(() => {
    if (customQuestions && customQuestions.length > 0 && !started) {
      const shuffled = [...customQuestions].sort(() => Math.random() - 0.5).slice(0, Math.min(count, customQuestions.length));
      const finalPool = shuffled.length ? shuffled : customQuestions.slice(0, Math.min(count, customQuestions.length));
      setPool(finalPool);
      setIdx(0); setAnswers({}); setChecked({}); setCheckedAnswers({}); setCheckAttempts({}); setFlags({});
      setStarted(true); setShowResults(false);
      setCustomQuizPool(null);
    }
  }, [customQuestions]);

  const start = (useCustom = false) => {
    const sourcePool = useCustom && customQuestions ? customQuestions : effectivePool;
    const shuffled = [...sourcePool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, sourcePool.length));
    const finalPool = shuffled.length ? shuffled : sourcePool.slice(0, Math.min(count, sourcePool.length));
    setPool(finalPool);
    setIdx(0); setAnswers({}); setChecked({}); setCheckedAnswers({}); setCheckAttempts({}); setFlags({}); setStarted(true); setShowResults(false);
    if (customQuizPool) setCustomQuizPool(null);
  };

  const current = pool[idx];
  const chosen = current ? answers[current.id] : undefined;
  const isChecked = current ? !!checked[current.id] : false;
  const checkedChoice = current ? checkedAnswers[current.id] : undefined;
  const currentCheckAttempts = current ? (checkAttempts[current.id] || 0) : 0;
  const correct = current && isChecked ? String(checkedChoice || "").trim().toLowerCase() === String(current.correctAnswer).trim().toLowerCase() : false;

  const setAnswer = (questionId: string, value: string) => {
    setAnswers(a => ({ ...a, [questionId]: value }));
    setChecked(c => c[questionId] ? ({ ...c, [questionId]: false }) : c);
  };

  const doCheck = () => {
    if (!current || !chosen) return;
    const isCorrect = String(chosen).trim().toLowerCase() === String(current.correctAnswer).trim().toLowerCase();
    recordAttempt(current.id, isCorrect, { answer: chosen, checkedAnswer: chosen, mode: examMode ? "exam" : "practice" });
    setCheckedAnswers(a => ({ ...a, [current.id]: chosen }));
    setCheckAttempts(a => ({ ...a, [current.id]: (a[current.id] || 0) + 1 }));
    setChecked(c => ({ ...c, [current.id]: true }));
  };

  const next = () => {
    if (examMode && current && chosen) {
      const isCorrect = String(chosen).trim().toLowerCase() === String(current.correctAnswer).trim().toLowerCase();
      recordAttempt(current.id, isCorrect, { answer: chosen, checkedAnswer: chosen, mode: "exam" });
      setCheckedAnswers(a => ({ ...a, [current.id]: chosen }));
      setChecked(c => ({ ...c, [current.id]: true }));
      setCheckAttempts(a => ({ ...a, [current.id]: (a[current.id] || 0) + 1 }));
    }
    if (idx < pool.length - 1) {
      const nextIdx = idx + 1;
      if (examMode && nextIdx === Math.floor(pool.length / 2)) {
        setModuleNumber(2);
        setModuleSeconds(32 * 60);
      }
      setIdx(nextIdx);
    } else {
      setShowResults(true);
    }
  };

  useEffect(() => {
    if (!started || !examMode || showResults) return;
    const t = setInterval(() => {
      setModuleSeconds(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [started, examMode, showResults]);

  useEffect(() => {
    if (!started || !examMode) return;
    if (moduleSeconds === 0) next();
  }, [moduleSeconds, started, examMode]);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); next(); }
      if (k === "p") { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      if (k === "f") { e.preventDefault(); setFlags(f => ({ ...f, [current.id]: !f[current.id] })); }
      if (["a", "b", "c", "d"].includes(k) && current.choices?.some(c => c.key.toLowerCase() === k)) {
        e.preventDefault();
        setAnswer(current.id, k.toUpperCase());
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (examMode) next();
        else doCheck();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, current, examMode, chosen, idx, pool.length]);

  const score = pool.filter(q => checked[q.id] && String(checkedAnswers[q.id] || "").trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()).length;
  const totalChecked = Object.keys(checked).length;

  const pieData = [
    { name: "Correct", value: score, fill: "#2ca974" },
    { name: "Incorrect", value: Math.max(0, totalChecked - score), fill: "#e56a8a" },
    { name: "Unanswered", value: Math.max(0, pool.length - totalChecked), fill: "#d8cfbd" },
  ];

  const bySkill = Object.entries(
    pool.reduce((acc: any, q) => {
      const k = q.skill;
      if (!acc[k]) acc[k] = { total: 0, correct: 0 };
      acc[k].total++;
      if (checked[q.id] && String(checkedAnswers[q.id] || "").toLowerCase() === String(q.correctAnswer).toLowerCase()) acc[k].correct++;
      return acc;
    }, {})
  ).map(([k, v]: any) => ({ skill: k, pct: v.total ? Math.round(v.correct / v.total * 100) : 0 }));

  const hasCustom = customQuizPool && customQuizPool.length > 0;
  const safeAttempts = attempts || [];

  const unresolvedMistakeIds = useMemo(() => {
    const byQ = new Map<string, any>();
    safeAttempts.forEach(a => {
      if (!byQ.has(a.questionId)) byQ.set(a.questionId, []);
      byQ.get(a.questionId)!.push(a);
    });
    const out: string[] = [];
    for (const [id, list] of byQ.entries()) {
      const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const lastWrongIdx = sorted.map(x => x.isCorrect).lastIndexOf(false);
      if (lastWrongIdx === -1) continue;
      const correctedAfter = sorted.slice(lastWrongIdx + 1).some(x => x.isCorrect);
      if (!correctedAfter) out.push(id);
    }
    return out;
  }, [safeAttempts]);

  const favoriteCount = useMemo(() => questions.filter(q => q.favorite).length, [questions]);

  const skillHeat = useMemo(() => {
    const skillMap = questions.reduce((acc, q) => {
      if (!acc[q.skill]) acc[q.skill] = { total: 0, wrong: 0 };
      acc[q.skill].total += 1;
      const qa = safeAttempts.filter(a => a.questionId === q.id);
      acc[q.skill].wrong += qa.filter(a => !a.isCorrect).length;
      return acc;
    }, {} as Record<string, { total: number; wrong: number }>);
    return Object.entries(skillMap)
      .map(([skill, v]) => ({ skill, score: v.total ? Math.round((v.wrong / Math.max(1, v.total)) * 100) : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [questions, safeAttempts]);

  const previewDomain = domain === "All" ? "Mixed" : domain;
  const previewSkill = skill === "All" ? "Any" : skill;
  const previewSub = subskill === "All" ? "Any" : subskill;
  const previewDiff = diff === "All" ? "Mixed" : diff;
  const eligible = effectivePool.length;
  const estMinutes = Math.max(5, Math.ceil((count * 1.6)));
  const countMin = 5;
  const countMax = 40;
  const countPct = ((count - countMin) / (countMax - countMin)) * 100;

  const applyPreset = (preset: string) => {
    if (preset === "10 Mixed") { setDomain("All"); setSkill("All"); setSubskill("All"); setDiff("All"); setCount(10); }
    if (preset === "20 Mixed") { setDomain("All"); setSkill("All"); setSubskill("All"); setDiff("All"); setCount(20); }
    if (preset === "Hard Math") { setDomain("Math"); setSkill("All"); setSubskill("All"); setDiff("Hard"); setCount(12); }
    if (preset === "Reading Drill") { setDomain("Reading & Writing"); setSkill("All"); setSubskill("All"); setDiff("Medium"); setCount(15); }
    if (preset === "Full Practice") { setDomain("All"); setSkill("All"); setSubskill("All"); setDiff("All"); setCount(30); }
  };

  const pickAdaptive = (source: SATQuestion[], take: number) => {
    if (!source.length) return [];
    const attemptsBySkill = source.reduce((acc, q) => {
      const a = attempts.filter(x => x.questionId === q.id);
      const wrong = a.filter(x => !x.isCorrect).length;
      const total = a.length;
      if (!acc[q.skill]) acc[q.skill] = { wrong: 0, total: 0 };
      acc[q.skill].wrong += wrong;
      acc[q.skill].total += total;
      return acc;
    }, {} as Record<string, { wrong: number; total: number }>);

    const weighted = source.map(q => {
      const s = attemptsBySkill[q.skill] || { wrong: 0, total: 0 };
      const missRate = s.total ? s.wrong / s.total : 0.5;
      const lowMasteryWeight = (100 - (q.mastery || 0)) / 100;
      const diffWeight = q.difficulty === "Hard" || q.difficulty === "Very Hard" ? 0.1 : 0;
      return { q, w: 0.25 + missRate * 0.5 + lowMasteryWeight * 0.35 + diffWeight };
    });
    const picked: SATQuestion[] = [];
    const pool = [...weighted];
    while (picked.length < take && pool.length) {
      const totalW = pool.reduce((a, x) => a + x.w, 0);
      let r = Math.random() * totalW;
      let i = 0;
      for (; i < pool.length; i++) {
        r -= pool[i].w;
        if (r <= 0) break;
      }
      picked.push(pool[Math.min(i, pool.length - 1)].q);
      pool.splice(Math.min(i, pool.length - 1), 1);
    }
    return picked;
  };

  const startSession = (name: string) => {
    setExamMode(false);
    setModuleNumber(1);
    setModuleSeconds(32 * 60);
    if (name === "Quick 10") { applyPreset("10 Mixed"); setTimeout(() => start(false), 0); return; }
    if (name === "Math Warmup") { setDomain("Math"); setSkill("All"); setSubskill("All"); setDiff("Easy"); setCount(10); setTimeout(() => start(false), 0); return; }
    if (name === "Hard Practice") { setDomain("All"); setSkill("All"); setSubskill("All"); setDiff("Hard"); setCount(15); setTimeout(() => start(false), 0); return; }
    if (name === "Review Mistakes") {
      if (unresolvedMistakeIds.length) {
        setCustomQuizPool(unresolvedMistakeIds);
        setTimeout(() => start(true), 0);
      }
      return;
    }
    if (name === "Mixed Review") {
      const adaptive = pickAdaptive(effectivePool, Math.min(20, effectivePool.length));
      if (!adaptive.length) return;
      setPool(adaptive);
      setIdx(0); setAnswers({}); setChecked({}); setCheckedAnswers({}); setCheckAttempts({}); setFlags({}); setStarted(true); setShowResults(false);
      return;
    }
    if (name === "Reading Sprint") { setDomain("Reading & Writing"); setSkill("All"); setSubskill("All"); setDiff("Medium"); setCount(12); setTimeout(() => start(false), 0); return; }
    if (name === "Bluebook Mode") {
      setDomain("All"); setSkill("All"); setSubskill("All"); setDiff("All"); setCount(22);
      setExamMode(true);
      setModuleNumber(1);
      setModuleSeconds(32 * 60);
      setTimeout(() => start(false), 0);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f7f2]">
      <div className="px-5 lg:px-10 py-9 max-w-[1280px] mx-auto">
        {!started ? (
          <div>
            <div className="mb-9">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-paper-300 text-[12px] tracking-[0.5px] text-ink-soft mb-3">
                OFFICIAL COLLEGE BOARD CONTENT
              </div>
              <h1 className="text-[42px] md:text-[46px] font-display font-[700] tracking-[-1.2px] text-ink leading-none">
                Digital SAT Quiz
              </h1>
              <p className="mt-2.5 text-[15px] text-ink-soft max-w-md">
                Practice with real College Board questions. Check answers manually. No timers.
              </p>
            </div>

            {hasCustom && (
              <div className="mb-8 p-4 rounded-2xl bg-[#f0e9d8] border border-[#c9b68a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">Custom selection ready</div>
                  <div className="text-sm text-ink-soft">{customQuestions?.length || 0} questions selected from the bank</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCustomQuizPool(null)} className="px-4 py-2 text-sm rounded-xl bg-white border">Clear</button>
                  <button onClick={() => start(true)} className="px-6 py-2.5 text-sm rounded-xl bg-[#3a6fe3] text-white font-semibold flex items-center gap-2">
                    <Play size={15}/> Start Selected Quiz
                  </button>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-2.5 font-medium px-1">Quick start</div>
                  <div className="flex flex-wrap gap-2">
                    {["10 Mixed", "20 Mixed", "Hard Math", "Reading Drill", "Full Practice"].map(p => (
                      <button key={p} onClick={() => applyPreset(p)}
                        className="px-4 py-1.5 text-[13px] rounded-full bg-white border border-paper-300 hover:border-[#c9c4b5] text-ink transition-all active:scale-[0.985]">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <GlassCard className="p-5">
                  <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-3 font-medium">Study Sessions</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {["Quick 10", "Math Warmup", "Hard Practice", "Review Mistakes", "Mixed Review", "Reading Sprint", "Bluebook Mode"].map(name => (
                      <button key={name} onClick={() => startSession(name)}
                        className="px-3 py-2 rounded-xl bg-white border border-paper-300 text-[12px] text-ink hover:border-[#bfb39d] text-left">
                        {name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-[12px] text-ink-soft">Mistakes: {unresolvedMistakeIds.length} • Favorites: {favoriteCount}</div>
                </GlassCard>

                <GlassCard className="p-8">
                  <div className="mb-6">
                    <div className="text-[15px] font-semibold tracking-tight text-ink">Configure your quiz</div>
                    <div className="text-[13px] text-ink-soft mt-0.5">Choose what you want to practice</div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-ink-soft mb-1.5 font-medium">Domain</div>
                        <Select value={domain} onValueChange={(value) => { setDomain(value); setSkill("All"); setSubskill("All"); }}>
                          <SelectTrigger><SelectValue placeholder="Domain" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="Math">Math</SelectItem>
                            <SelectItem value="Reading & Writing">Reading &amp; Writing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-ink-soft mb-1.5 font-medium">Skill</div>
                        <Select value={skill} onValueChange={(value) => { setSkill(value); setSubskill("All"); }}>
                          <SelectTrigger><SelectValue placeholder="Skill" /></SelectTrigger>
                          <SelectContent>
                            {skillOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-ink-soft mb-1.5 font-medium">Subskill</div>
                        <Select value={subskill} disabled={subskillOptions.length === 0} onValueChange={setSubskill}>
                          <SelectTrigger><SelectValue placeholder="Subskill" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All</SelectItem>
                            {subskillOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-ink-soft mb-1.5 font-medium">Difficulty</div>
                        <Select value={diff} onValueChange={setDiff}>
                          <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                            <SelectItem value="Very Hard">Very Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-xs uppercase tracking-wider text-ink-soft font-medium">Number of questions</div>
                        <div className="text-[12px] tabular-nums text-[#2f5cc7] font-semibold px-2.5 py-1 rounded-lg bg-[#eaf1ff] border border-[#cfe0ff]">
                          {count}
                        </div>
                      </div>
                      <input type="range" min={countMin} max={countMax} step={1} value={count} onChange={e => setCount(parseInt(e.target.value))}
                        className="w-full h-2.5 appearance-none rounded-full cursor-pointer"
                        style={{ background: `linear-gradient(to right, #3a6fe3 0%, #3a6fe3 ${countPct}%, #d9d2c6 ${countPct}%, #d9d2c6 100%)` }} />
                      <div className="flex justify-between text-[10px] text-ink-faint mt-0.5">
                        <div>{countMin}</div><div>{countMax}</div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <GlassCard className="p-7">
                  <div className="text-xs uppercase tracking-[1px] text-ink-soft mb-4 font-medium">Quiz preview</div>
                  <div className="space-y-4 text-[14px]">
                    <div className="flex justify-between"><span className="text-ink-soft">Domain</span><span className="font-medium text-ink">{previewDomain}</span></div>
                    <div className="flex justify-between"><span className="text-ink-soft">Skill</span><span className="font-medium text-ink">{previewSkill}</span></div>
                    <div className="flex justify-between"><span className="text-ink-soft">Subskill</span><span className="font-medium text-ink">{previewSub}</span></div>
                    <div className="flex justify-between"><span className="text-ink-soft">Difficulty</span><span className="font-medium text-ink">{previewDiff}</span></div>
                    <div className="flex justify-between border-t border-paper-300 pt-4"><span className="text-ink-soft">Questions</span><span className="font-semibold tabular-nums text-ink">{count}</span></div>
                    <div className="flex justify-between"><span className="text-ink-soft">Eligible</span><span className="font-semibold tabular-nums text-[#2ca974]">{eligible}</span></div>
                    <div className="flex justify-between"><span className="text-ink-soft">Est. time</span><span className="font-medium text-ink">{estMinutes} min</span></div>
                  </div>
                </GlassCard>

                <div>
                  <button
                    onClick={() => start(false)}
                    disabled={eligible === 0}
                    className="w-full py-[18px] rounded-2xl bg-[#3a6fe3] hover:bg-[#2f5cc7] active:bg-[#274ea8] transition-all text-white font-semibold text-[17px] shadow-[0_4px_14px_rgb(58,111,227,0.35)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                    Start Quiz <Play size={19}/>
                  </button>
                  <p className="text-center text-[12px] text-ink-soft mt-3">
                    {eligible} questions available • Official CB content
                  </p>
                </div>

                <GlassCard className="p-5">
                  <div className="text-sm font-[600] mb-2 text-ink">Skill Heat Map</div>
                  <div className="space-y-2">
                    {skillHeat.map(s => (
                      <button key={s.skill} onClick={() => { setSkill(s.skill); setDomain(questions.find(q => q.skill === s.skill)?.domain || "All"); }} className="w-full text-left">
                        <div className="flex justify-between text-[12px] text-ink-soft mb-1">
                          <span>{s.skill}</span><span>{s.score}%</span>
                        </div>
                        <div className="h-[8px] rounded-full bg-paper-200 overflow-hidden">
                          <div className="h-full bg-[#3a6fe3]" style={{ width: `${Math.min(100, s.score)}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </div>

            <div className="mt-9 text-[12px] text-ink-soft px-1">
              Tip: Use the Bank tab to select specific questions for a custom quiz.
            </div>
          </div>
        ) : (
          <div className={
            current?.domain === "Reading & Writing" && current?.passage
              ? "grid xl:grid-cols-[560px_1fr] gap-6"
              : "grid xl:grid-cols-[1fr_440px] gap-6"
          }>
            {current?.domain === "Reading & Writing" && current?.passage && (
              <div className="space-y-4">
                <GlassCard className="p-6 h-fit max-h-[80vh] overflow-auto scrollbar-thin">
                  <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-3">Passage</div>
                  <SafeHtml html={current.passage} className="text-[15px] leading-relaxed sat-content text-ink" />
                </GlassCard>
                <GlassCard className="p-4">
                  <div className="text-[12px] text-ink-soft uppercase tracking-wider">Session</div>
                  <div className="mt-2 text-sm space-y-1 text-ink-soft">
                    <div>Checked: {totalChecked} / {pool.length}</div>
                    <div>Correct: {score}</div>
                    <div>Flagged: {Object.values(flags).filter(Boolean).length}</div>
                  </div>
                  <div className="text-[11px] text-ink-soft mt-3">Desmos auto-hidden for R&amp;W.</div>
                </GlassCard>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4 text-sm flex-wrap gap-3">
                <div className="text-ink-soft">
                  Question {idx + 1} / {pool.length} • {current?.domain} › {current?.skill}{current?.subskill ? ` › ${current.subskill}` : ""}
                </div>
                <div className="flex items-center gap-3">
                  {current && (
                    <button onClick={() => toggleFavorite(current.id)}
                      className={`flex items-center gap-1.5 text-[13px] ${current.favorite ? "text-[#b8870a]" : "text-ink-soft hover:text-ink"}`}>
                      <Star size={14} fill={current.favorite ? "#f7d35c" : "none"} /> {current.favorite ? "Favorited" : "Favorite"}
                    </button>
                  )}
                  <button onClick={() => current && setFlags(f => ({ ...f, [current.id]: !f[current.id] }))}
                    className={`flex items-center gap-1.5 text-[13px] ${flags[current?.id || ""] ? "text-[#b45309]" : "text-ink-soft hover:text-ink"}`}>
                    <Flag size={14} /> {flags[current?.id || ""] ? "Flagged" : "Flag"}
                  </button>
                  {current?.domain === "Math" && (
                    <button onClick={() => setShowDesmos(s => !s)}
                      className="glass-subtle px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[13px] text-ink">
                      <Calculator size={14} /> {showDesmos ? "Hide Desmos" : "Desmos"}
                    </button>
                  )}
                </div>
              </div>

              {current && (
                <GlassCard className="p-7">
                  {examMode && (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-[#eef3ff] border border-[#cfdbf9] text-[12px] text-[#2f5cc7] flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5"><Timer size={13} /> Bluebook Mode • Module {moduleNumber}</span>
                      <span className="font-semibold tabular-nums">{Math.floor(moduleSeconds / 60)}:{String(moduleSeconds % 60).padStart(2, "0")}</span>
                    </div>
                  )}
                  <div className="text-[11px] font-mono text-ink-soft mb-3">
                    {current.id} • {current.difficulty}
                  </div>

                  <SafeHtml html={current.questionText} className="text-[17px] leading-relaxed sat-content text-ink" />

                  {current.mathExpression && (
                    <div className="mt-4 glass-subtle rounded-xl p-3 text-[15px] text-ink">
                      <InlineMath math={current.mathExpression} />
                    </div>
                  )}
                  {current.imageUrl && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-paper-300 bg-white p-3">
                      <img src={current.imageUrl} alt="question figure" className="max-h-[360px] mx-auto" />
                    </div>
                  )}

                  <div className="mt-6 space-y-3">
                    {current.choices && current.choices.length > 0 ? current.choices.map(opt => (
                      <button key={opt.key}
                        onClick={() => setAnswer(current.id, opt.key)}
                        className={`w-full text-left px-4 py-3 rounded-[16px] border transition-all ${
                          chosen === opt.key
                            ? isChecked
                              ? (correct ? "border-[#2ca974] bg-[#e8f7ef]" : "border-[#e56a8a] bg-[#fff0f3]")
                              : "border-[#5b8def] bg-[#eef4ff]"
                            : "border-paper-300 bg-white hover:border-[#c9c4b5]"
                        } ${isChecked ? "cursor-default" : ""}`}>
                        <div className="flex gap-3 items-start">
                          <span className="font-mono text-[12px] text-[#3a6fe3] mt-0.5">{opt.key}</span>
                          <div className="flex-1 text-[14px] text-ink sat-content">
                            <SafeHtml html={opt.text} />
                          </div>
                        </div>
                      </button>
                    )) : (
                      <input
                        placeholder="Type your answer…"
                        value={chosen || ""}
                        onChange={e => setAnswer(current.id, e.target.value)}
                        className="w-full bg-white text-ink border border-paper-300 rounded-xl px-4 py-3 text-[15px] outline-none"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    {!examMode && (
                      <button onClick={doCheck} disabled={!chosen}
                        className="px-5 py-[11px] rounded-xl bg-[#3a6fe3] text-white font-[650] disabled:opacity-40 flex items-center gap-2">
                        <CheckCircle size={16} /> Check Answer
                      </button>
                    )}
                    <button onClick={next}
                      className="ml-auto px-5 py-[11px] rounded-xl bg-white border border-paper-300 font-[650] flex items-center gap-2 text-ink">
                      {idx < pool.length - 1 ? "Next →" : (examMode ? "Submit Exam" : "Finish Quiz")}
                    </button>
                  </div>

                  {!examMode && isChecked && (
                    <div className={`mt-4 text-[13px] font-[600] ${correct ? "text-[#15803d]" : "text-[#be185d]"}`}>
                      {correct
                        ? (currentCheckAttempts > 1 ? `Correct ✓ (check ${currentCheckAttempts})` : "Correct ✓")
                        : (currentCheckAttempts > 1 ? `Still incorrect (check ${currentCheckAttempts})` : "Incorrect")}
                    </div>
                  )}

                  {!examMode && isChecked && !correct && (
                    <div className="mt-1 text-[12px] text-ink-soft">
                      Your checked answer: <span className="font-semibold text-ink">{checkedChoice || "—"}</span>
                    </div>
                  )}

                  {!examMode && isChecked && (
                    <div className="mt-4 glass-subtle rounded-xl p-4 text-[13px] text-ink-soft">
                      <SafeHtml html={current.explanation || "No explanation saved yet."} className="sat-content" />
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="text-[11px] text-ink-faint mb-1 flex items-center gap-1"><NotebookPen size={12} /> Question Note</div>
                    <textarea
                      value={questionNotes[current.id] || ""}
                      onChange={e => setQuestionNote(current.id, e.target.value)}
                      placeholder="Write your takeaway for this question..."
                      className="w-full h-20 bg-white text-ink border border-paper-300 rounded-xl p-3 text-sm"
                    />
                  </div>

                  <div className="flex justify-between mt-7 text-sm">
                    <button disabled={idx === 0} onClick={() => setIdx(i => Math.max(0, i - 1))}
                      className="px-4 py-2 rounded-xl glass-subtle flex items-center gap-1 disabled:opacity-30 text-ink">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <div className="text-ink-soft">
                      {Object.keys(checked).length} / {pool.length} checked
                    </div>
                    <button onClick={next}
                      className="px-4 py-2 rounded-xl glass-subtle flex items-center gap-1 text-ink">
                      {idx === pool.length - 1 ? "Results" : "Next"} <ChevronRight size={16} />
                    </button>
                  </div>
                </GlassCard>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {pool.map((q, i) => {
                  const st = checked[q.id]
                    ? (String(checkedAnswers[q.id] || "").toLowerCase() === String(q.correctAnswer).toLowerCase() ? "ok" : "bad")
                    : answers[q.id] ? "ans" : "";
                  return (
                    <button key={q.id} onClick={() => setIdx(i)}
                      className={`w-9 h-9 rounded-[12px] text-[12px] border transition-all ${
                        i === idx ? "border-[#3a6fe3] text-[#3a6fe3] scale-105" :
                        st === "ok" ? "border-[#2ca974] text-[#15803d]" :
                        st === "bad" ? "border-[#e56a8a] text-[#be185d]" :
                        st === "ans" ? "border-[#b8a98a] text-ink-soft" :
                        "border-paper-300 text-ink-soft"
                      } glass-subtle`}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {current?.domain === "Math" && showDesmos && (
              <div className="space-y-4">
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-[600] text-ink">Desmos Calculator</div>
                    <div className="flex items-center gap-2 text-[11px] text-ink-soft">
                      <span>height</span>
                      <input type="range" min={280} max={760} value={dHeight} onChange={e => setDHeight(parseInt(e.target.value))} className="accent-[#3a6fe3]" />
                      <button onClick={() => setShowDesmos(false)} className="ml-2 text-ink-soft hover:text-ink"><X size={14} /></button>
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-paper-300 bg-white" style={{ height: dHeight, minHeight: 260, resize: "vertical", overflow: "auto" }}>
                    <iframe src="https://www.desmos.com/calculator" className="w-full h-full" title="Desmos" />
                  </div>
                  <div className="text-[11px] text-ink-soft mt-2">Resizable • drag bottom edge • SAT official</div>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="text-[12px] text-ink-soft uppercase tracking-wider">Session</div>
                  <div className="mt-2 text-sm space-y-1 text-ink-soft">
                    <div>Checked: {totalChecked} / {pool.length}</div>
                    <div>Correct: {score}</div>
                    <div>Flagged: {Object.values(flags).filter(Boolean).length}</div>
                  </div>
                </GlassCard>
              </div>
            )}

            {current?.domain === "Reading & Writing" && !current?.passage && (
              <div className="space-y-4">
                <GlassCard className="p-4">
                  <div className="text-[12px] text-ink-soft uppercase tracking-wider">Session</div>
                  <div className="mt-2 text-sm space-y-1 text-ink-soft">
                    <div>Checked: {totalChecked} / {pool.length}</div>
                    <div>Correct: {score}</div>
                    <div>Flagged: {Object.values(flags).filter(Boolean).length}</div>
                  </div>
                  <div className="text-[11px] text-ink-soft mt-3">Desmos auto-hidden for R&amp;W.</div>
                </GlassCard>
              </div>
            )}
          </div>
        )}

        {showResults && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl glass rounded-[28px] p-7 max-h-[90vh] overflow-auto">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[12px] text-[#3a6fe3] uppercase tracking-wider">Quiz Complete</div>
                  <h2 className="text-[30px] font-display font-[700] mt-1 text-ink">Nice work!</h2>
                  <div className="text-ink-soft mt-1">
                    Score <b className="text-ink">{score}</b> / {pool.length} • {pool.length ? Math.round(score / pool.length * 100) : 0}%
                  </div>
                </div>
                <button onClick={() => { setShowResults(false); setStarted(false); }} className="glass-subtle p-2 rounded-xl text-ink"><X size={18} /></button>
              </div>

              <div className="grid md:grid-cols-3 gap-5 mt-6">
                <GlassCard className="p-5 md:col-span-1">
                  <div className="text-sm font-[600] mb-2 text-ink">Breakdown</div>
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={80} paddingAngle={2}>
                          {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5dfd2", borderRadius: 12, color: "#2b2b2a" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
                <GlassCard className="p-5 md:col-span-2">
                  <div className="text-sm font-[600] mb-2 text-ink">Accuracy by Skill</div>
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart data={bySkill}>
                        <XAxis dataKey="skill" stroke="#8a8680" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis stroke="#8a8680" fontSize={12} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5dfd2", borderRadius: 12, color: "#2b2b2a" }} />
                        <Bar dataKey="pct" fill="#3a6fe3" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>

              <div className="mt-6">
                <div className="text-sm font-[600] mb-3 text-ink">Question Review</div>
                <div className="space-y-2 max-h-[300px] overflow-auto pr-2 scrollbar-thin">
                  {pool.map((q, i) => {
                    const a = checkedAnswers[q.id] ?? answers[q.id];
                    const ok = String(a || "").toLowerCase() === String(q.correctAnswer).toLowerCase();
                    return (
                      <div key={q.id} className="flex items-start gap-3 text-[13px] glass-subtle rounded-xl px-3 py-2">
                        <span className={`mt-0.5 text-[11px] font-mono ${ok ? "text-[#15803d]" : "text-[#be185d]"}`}>{i + 1}</span>
                        <div className="flex-1">
                          <div className="text-ink-soft line-clamp-1">
                            <SafeHtml html={q.questionText} />
                          </div>
                          <div className="text-[11px] text-ink-faint">Your: {a || "—"} • Correct: {q.correctAnswer} • {q.skill}</div>
                        </div>
                        <div className={`text-[11px] ${ok ? "text-[#15803d]" : "text-[#be185d]"}`}>{ok ? "✓" : "✗"}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowResults(false); setStarted(false); }} className="px-4 py-2 rounded-xl glass-subtle text-ink">Close</button>
                <button onClick={() => { setIdx(0); setAnswers({}); setChecked({}); setCheckedAnswers({}); setCheckAttempts({}); setShowResults(false); }}
                  className="px-4 py-2 rounded-xl bg-[#3a6fe3] text-white font-[600] flex items-center gap-2">
                  <RotateCcw size={15} /> Retry Quiz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
