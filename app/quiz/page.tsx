"use client";
import { useBank } from "@/lib/store";
import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { SATQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Flag, ChevronLeft, ChevronRight, CheckCircle, RotateCcw, X } from "lucide-react";
import { InlineMath } from "react-katex";
import { SAT_DOMAINS, MATH_SUBSKILLS, RW_SUBSKILLS } from "@/lib/sat-categories";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { SafeHtml } from "@/components/ui/safe-html";

export default function QuizPage() {
  const questions = useBank(s=>s.questions);
  const [domain, setDomain] = useState<string>("All");
  const [skill, setSkill] = useState<string>("All");
  const [diff, setDiff] = useState("All");
  const [count, setCount] = useState(5);
  const [started, setStarted] = useState(false);
  const [pool, setPool] = useState<SATQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [checked, setChecked] = useState<Record<string,boolean>>({});
  const [flags, setFlags] = useState<Record<string,boolean>>({});
  const [showDesmos, setShowDesmos] = useState(true);
  const [dHeight, setDHeight] = useState(420);
  const [showResults, setShowResults] = useState(false);

  const skillOptions = useMemo(()=>{
    if (domain==="Math") return ["All", ...Object.keys(MATH_SUBSKILLS)];
    if (domain==="Reading & Writing") return ["All", ...Object.keys(RW_SUBSKILLS)];
    return ["All"];
  }, [domain]);

  const subskillOptions = useMemo(()=>{
    if (skill==="All" || domain==="All") return [];
    if (domain==="Math") return MATH_SUBSKILLS[skill] || [];
    return RW_SUBSKILLS[skill] || [];
  }, [domain, skill]);

  const [subskill, setSubskill] = useState<string>("All");

  const filteredPool = useMemo(()=> questions.filter(q=>
    (domain==="All"||q.domain===domain) &&
    (skill==="All"||q.skill===skill) &&
    (subskill==="All"||q.subskill===subskill) &&
    (diff==="All"||q.difficulty===diff)
  ), [questions, domain, skill, subskill, diff]);

  const start = () => {
    const shuffled = [...filteredPool].sort(()=>Math.random()-0.5).slice(0, Math.min(count, filteredPool.length));
    setPool(shuffled.length?shuffled:filteredPool.slice(0, Math.min(count, filteredPool.length)));
    setIdx(0); setAnswers({}); setChecked({}); setFlags({}); setStarted(true); setShowResults(false);
  };

  const current = pool[idx];
  const chosen = current ? answers[current.id] : undefined;
  const isChecked = current ? !!checked[current.id] : false;
  const correct = current && isChecked ? String(chosen||"").trim().toLowerCase() === String(current.correctAnswer).trim().toLowerCase() : false;

  const doCheck = () => {
    if (!current || !chosen) return;
    setChecked(c=>({...c, [current.id]: true}));
    // update bank stats 0-> keep 0 per no-fake-stats policy? we can increment locally but not persist fake
  };

  const next = () => {
    if (idx < pool.length-1) setIdx(i=>i+1);
    else setShowResults(true);
  };

  const score = pool.filter(q=> checked[q.id] && String(answers[q.id]||"").trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()).length;
  const totalChecked = Object.keys(checked).length;

  // results chart data
  const pieData = [
    { name:"Correct", value: score, fill:"#00FF9F" },
    { name:"Incorrect", value: Math.max(0, totalChecked - score), fill:"#FF2A6D" },
    { name:"Unanswered", value: Math.max(0, pool.length - totalChecked), fill:"#2a2f36" },
  ];
  const bySkill = Object.entries(
    pool.reduce((acc:any, q)=>{ const k=q.skill; if(!acc[k]) acc[k]={total:0, correct:0}; acc[k].total++; if(checked[q.id] && String(answers[q.id]||"").toLowerCase()===String(q.correctAnswer).toLowerCase()) acc[k].correct++; return acc; }, {})
  ).map(([k,v]:any)=>({ skill:k, pct: v.total? Math.round(v.correct/v.total*100):0 }));

  return (
    <div className="px-5 lg:px-10 py-7 max-w-[1440px] mx-auto">
      {!started ? (
        <div className="max-w-5xl">
          <h1 className="text-[34px] font-display font-[700] tracking-tight">Digital SAT Quiz</h1>
          <p className="text-ink-soft mt-2">Official College Board domains • choose subskill • check answer manually • results dashboard at end.</p>

          <GlassCard className="p-7 mt-7">
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Domain */}
              <label className="lg:col-span-2">
                <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-2">Domain</div>
                <select value={domain} onChange={e=>{setDomain(e.target.value); setSkill("All"); setSubskill("All");}}
                  className="w-full bg-white border border-paper-300 rounded-[14px] px-3 py-[12px] text-[14px] outline-none focus:border-neon-cyan/60 focus:shadow-neon-cyan transition-all">
                  <option>All</option>
                  <option>Math</option>
                  <option>Reading & Writing</option>
                </select>
              </label>
              {/* Skill */}
              <label className="lg:col-span-2">
                <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-2">Skill / Category</div>
                <select value={skill} onChange={e=>{setSkill(e.target.value); setSubskill("All");}}
                  className="w-full bg-white border border-paper-300 rounded-[14px] px-3 py-[12px] text-[14px] outline-none focus:border-neon-cyan/60">
                  {skillOptions.map(s=> <option key={s}>{s}</option>)}
                </select>
              </label>
              {/* Subskill */}
              <label className="lg:col-span-2">
                <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-2">Subskill</div>
                <select value={subskill} disabled={subskillOptions.length===0}
                  onChange={e=>setSubskill(e.target.value)}
                  className="w-full bg-white border border-paper-300 rounded-[14px] px-3 py-[12px] text-[14px] outline-none focus:border-neon-cyan/60 disabled:opacity-50">
                  <option>All</option>
                  {subskillOptions.map(s=> <option key={s}>{s}</option>)}
                </select>
              </label>

              <label>
                <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-2">Difficulty</div>
                <select value={diff} onChange={e=>setDiff(e.target.value)}
                  className="w-full bg-white border border-paper-300 rounded-[14px] px-3 py-[12px] text-[14px]">
                  <option>All</option><option>Easy</option><option>Medium</option><option>Hard</option><option>Very Hard</option>
                </select>
              </label>
              <label>
                <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-2"># Questions</div>
                <input type="number" min={1} max={40} value={count} onChange={e=>setCount(parseInt(e.target.value)||5)}
                  className="w-full bg-white border border-paper-300 rounded-[14px] px-3 py-[12px] text-[14px]"/>
              </label>
              <div className="md:col-span-2 lg:col-span-4 flex items-end justify-between">
                <div className="text-[13px] text-ink-soft">
                  {filteredPool.length} eligible in bank • {questions.length} total • official CB taxonomy
                </div>
                <button onClick={start} disabled={filteredPool.length===0}
                  className="px-6 py-[12px] rounded-[14px] bg-neon-cyan text-black font-[650] shadow-neon-cyan disabled:opacity-40">
                  Start Quiz →
                </button>
              </div>
            </div>
          </GlassCard>

          <div className="text-[12px] text-ink-soft mt-4">
            Tip: run <code className="bg-zinc-800 px-1 rounded">npm run cb:full</code> to import all 3,444 College Board questions into your local bank.
          </div>
        </div>
      ) : (
        <div className={
          current?.domain==="Reading & Writing" && current?.passage
            ? "grid xl:grid-cols-[560px_1fr] gap-6"
            : "grid xl:grid-cols-[1fr_440px] gap-6"
        }>
          {/* Left: passage for RW */}
          {current?.domain==="Reading & Writing" && current?.passage && (
            <GlassCard className="p-6 h-fit max-h-[80vh] overflow-auto scrollbar-thin">
              <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-3">Passage</div>
              {current.passage.includes("<") ? <SafeHtml html={current.passage} className="text-[15px] leading-relaxed sat-content" /> :
                <div className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{current.passage}</div>}
            </GlassCard>
          )}

          {/* Question column */}
          <div>
            <div className="flex items-center justify-between mb-4 text-sm flex-wrap gap-3">
              <div className="text-ink-soft">
                Question {idx+1} / {pool.length} • {current?.domain} › {current?.skill}{current?.subskill ? ` › ${current.subskill}` : ""}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={()=> current && setFlags(f=>({...f, [current.id]: !f[current.id]}))}
                  className={`flex items-center gap-1.5 text-[13px] ${flags[current?.id||""]?"text-amber-300":"text-ink-soft hover:text-ink"}`}>
                  <Flag size={14}/> {flags[current?.id||""] ? "Flagged" : "Flag"}
                </button>
                {current?.domain==="Math" && (
                  <button onClick={()=>setShowDesmos(s=>!s)}
                    className="glass-subtle px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[13px]">
                    <Calculator size={14}/> {showDesmos?"Hide Desmos":"Desmos"}
                  </button>
                )}
              </div>
            </div>

            {current && (
              <GlassCard className="p-7">
                <div className="text-[11px] font-mono text-ink-soft mb-3">
                  {current.id} • {current.difficulty}
                </div>

                {current.questionText?.includes("<") ? (
                  <SafeHtml html={current.questionText} className="text-[17px] leading-relaxed sat-content" />
                ) : (
                  <div className="text-[17px] leading-relaxed whitespace-pre-wrap">{current.questionText}</div>
                )}

                {current.mathExpression && (
                  <div className="mt-4 glass-subtle rounded-xl p-3 text-[15px]">
                    <InlineMath math={current.mathExpression}/>
                  </div>
                )}
                {current.imageUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-paper-300 bg-[#0a0f13] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={current.imageUrl} alt="question figure" className="max-h-[340px] mx-auto"/>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  {current.choices && current.choices.length>0 ? current.choices.map(opt=>(
                    <button key={opt.key}
                      disabled={isChecked}
                      onClick={()=>setAnswers(a=>({...a, [current.id]: opt.key}))}
                      className={`w-full text-left px-4 py-3 rounded-[16px] border transition-all ${
                        chosen===opt.key
                          ? isChecked
                            ? (correct ? "border-[#2ca974] bg-[#e8f7ef]" : "border-[#e56a8a] bg-[#fff0f3]")
                            : "border-[#5b8def] bg-[#eef4ff]"
                          : "border-paper-300 bg-white hover:border-[#c9c4b5]"
                      } ${isChecked ? "cursor-default":""}`}>

                      <div className="flex gap-3 items-start">
                        <span className="font-mono text-[12px] text-[#3a6fe3] mt-0.5">{opt.key}</span>
                        <div className="flex-1 text-[14px] text-ink sat-content">
                          {opt.text?.includes("<") ? <SafeHtml html={opt.text} /> : opt.text}
                        </div>
                      </div>
                    </button>
                  )) : (
                    <input
                      placeholder="Type your answer…"
                      disabled={isChecked}
                      value={chosen||""}
                      onChange={e=>setAnswers(a=>({...a, [current.id]: e.target.value}))}
                      className="w-full bg-[#0b0f13] border border-paper-300 rounded-xl px-4 py-3 text-[15px] outline-none focus:border-neon-cyan/60 disabled:opacity-70"
                    />
                  )}
                </div>

                <div className="flex items-center gap-3 mt-6">
                  {!isChecked ? (
                    <button onClick={doCheck} disabled={!chosen}
                      className="px-5 py-[11px] rounded-xl bg-neon-cyan text-black font-[650] disabled:opacity-40 flex items-center gap-2">
                      <CheckCircle size={16}/> Check Answer
                    </button>
                  ) : (
                    <div className={`text-[13px] font-[600] ${correct ? "text-neon-green":"text-neon-pink"}`}>
                      {correct ? "Correct ✓" : `Incorrect — Answer: ${current.correctAnswer}`}
                    </div>
                  )}
                  {isChecked && (
                    <button onClick={next}
                      className="ml-auto px-4 py-[10px] rounded-xl glass-subtle text-[13px]">
                      {idx < pool.length-1 ? "Next →" : "Finish Quiz"}
                    </button>
                  )}
                </div>

                <AnimatePresence>
                {isChecked && (
                  <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                    className="mt-4 glass-subtle rounded-xl p-4 text-[13px] text-ink-soft">
                    {current.explanation?.includes("<") ? <SafeHtml html={current.explanation} className="sat-content" /> : (current.explanation || "No explanation saved yet.")} saved yet."}
                  </motion.div>
                )}
                </AnimatePresence>

                <div className="flex justify-between mt-7 text-sm">
                  <button disabled={idx===0} onClick={()=>setIdx(i=>Math.max(0,i-1))}
                    className="px-4 py-2 rounded-xl glass-subtle flex items-center gap-1 disabled:opacity-30">
                    <ChevronLeft size={16}/> Back
                  </button>
                  <div className="text-ink-soft">
                    {Object.keys(checked).length} / {pool.length} checked
                  </div>
                  <button onClick={next}
                    className="px-4 py-2 rounded-xl glass-subtle flex items-center gap-1">
                    {idx===pool.length-1 ? "Results" : "Skip"} <ChevronRight size={16}/>
                  </button>
                </div>
              </GlassCard>
            )}

            {/* navigator */}
            <div className="flex flex-wrap gap-2 mt-4">
              {pool.map((q,i)=>{
                const st = checked[q.id]
                  ? (String(answers[q.id]||"").toLowerCase()===String(q.correctAnswer).toLowerCase() ? "ok":"bad")
                  : answers[q.id] ? "ans":"";
                return (
                  <button key={q.id} onClick={()=>setIdx(i)}
                    className={`w-9 h-9 rounded-[12px] text-[12px] border transition-all ${
                      i===idx ? "border-neon-cyan text-neon-cyan scale-105" :
                      st==="ok" ? "border-neon-green/60 text-neon-green" :
                      st==="bad" ? "border-neon-pink/60 text-neon-pink" :
                      st==="ans" ? "border-zinc-500 text-ink-soft" :
                      "border-paper-300 text-ink-soft"
                    } glass-subtle`}>
                    {i+1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right column: Desmos (Math only, resizable) */}
          {current?.domain==="Math" && showDesmos && (
            <div className="space-y-4">
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-[600]">Desmos Calculator</div>
                  <div className="flex items-center gap-2 text-[11px] text-ink-soft">
                    <span>height</span>
                    <input type="range" min={280} max={760} value={dHeight} onChange={e=>setDHeight(parseInt(e.target.value))} />
                    <button onClick={()=>setShowDesmos(false)} className="ml-2 text-ink-soft hover:text-ink"><X size={14}/></button>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden border border-paper-300 bg-[#0a0a0b] resize-y overflow-auto" style={{height: dHeight, minHeight:260}}>
                  <iframe
                    src="https://www.desmos.com/calculator"
                    className="w-full h-full"
                    style={{ filter: "invert(0.92) hue-rotate(180deg)" }}
                    title="Desmos"
                  />
                </div>
                <div className="text-[11px] text-ink-soft mt-2">Drag bottom edge to resize • SAT official style • dark matched</div>
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

          {current?.domain==="Reading & Writing" && (
            <div className="space-y-4">
              <GlassCard className="p-4">
                <div className="text-[12px] text-ink-soft uppercase tracking-wider">Session</div>
                <div className="mt-2 text-sm space-y-1 text-ink-soft">
                  <div>Checked: {totalChecked} / {pool.length}</div>
                  <div>Correct: {score}</div>
                  <div>Flagged: {Object.values(flags).filter(Boolean).length}</div>
                </div>
                <div className="text-[11px] text-ink-soft mt-3">Desmos auto-hidden for Reading & Writing.</div>
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* Results modal */}
      <AnimatePresence>
      {showResults && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{y:24, scale:.98, opacity:0}} animate={{y:0, scale:1, opacity:1}}
            className="w-full max-w-5xl glass rounded-[28px] p-7 max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[12px] text-neon-cyan uppercase tracking-wider">Quiz Complete</div>
                <h2 className="text-[30px] font-display font-[700] mt-1">Nice work!</h2>
                <div className="text-ink-soft mt-1">
                  Score <b className="text-ink">{score}</b> / {pool.length} • {pool.length ? Math.round(score/pool.length*100) : 0}%
                </div>
              </div>
              <button onClick={()=>{setShowResults(false); setStarted(false);}}
                className="glass-subtle p-2 rounded-xl"><X size={18}/></button>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mt-6">
              <GlassCard className="p-5 md:col-span-1">
                <div className="text-sm font-[600] mb-2">Breakdown</div>
                <div style={{width:"100%", height:200}}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={80} paddingAngle={2}>
                        {pieData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                      </Pie>
                      <Tooltip contentStyle={{background:"#0b1014", border:"1px solid #222", borderRadius:12}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
              <GlassCard className="p-5 md:col-span-2">
                <div className="text-sm font-[600] mb-2">Accuracy by Skill</div>
                <div style={{width:"100%", height:200}}>
                  <ResponsiveContainer>
                    <BarChart data={bySkill}>
                      <XAxis dataKey="skill" stroke="#777" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60}/>
                      <YAxis stroke="#777" fontSize={12} domain={[0,100]}/>
                      <Tooltip contentStyle={{background:"#0b1014", border:"1px solid #222", borderRadius:12}}/>
                      <Bar dataKey="pct" fill="#00F5FF" radius={[6,6,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>

            <div className="mt-6">
              <div className="text-sm font-[600] mb-3">Question Review</div>
              <div className="space-y-2 max-h-[300px] overflow-auto pr-2 scrollbar-thin">
                {pool.map((q,i)=>{
                  const a = answers[q.id];
                  const ok = String(a||"").toLowerCase()===String(q.correctAnswer).toLowerCase();
                  return (
                    <div key={q.id} className="flex items-start gap-3 text-[13px] glass-subtle rounded-xl px-3 py-2">
                      <span className={`mt-0.5 text-[11px] font-mono ${ok?"text-neon-green":"text-neon-pink"}`}>{i+1}</span>
                      <div className="flex-1">
                        <div className="text-ink-soft line-clamp-1">{q.questionText}</div>
                        <div className="text-[11px] text-ink-soft">Your: {a||"—"} • Correct: {q.correctAnswer} • {q.skill}</div>
                      </div>
                      <div className={`text-[11px] ${ok?"text-neon-green":"text-neon-pink"}`}>{ok?"✓":"✗"}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>{setShowResults(false); setStarted(false);}}
                className="px-4 py-2 rounded-xl glass-subtle">Close</button>
              <button onClick={()=>{ setIdx(0); setAnswers({}); setChecked({}); setShowResults(false); }}
                className="px-4 py-2 rounded-xl bg-neon-cyan text-black font-[600] flex items-center gap-2">
                <RotateCcw size={15}/> Retry Quiz
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
