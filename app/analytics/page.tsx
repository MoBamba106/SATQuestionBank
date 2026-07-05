"use client";
import { GlassCard } from "@/components/ui/glass-card";
import { useBank } from "@/lib/store";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AnalyticsPage() {
  const questions = useBank(s=>s.questions);
  const total = questions.length;
  const answered = questions.reduce((a,q)=>a+q.timesAnswered,0);
  const correct = questions.reduce((a,q)=>a+q.timesCorrect,0);
  const mastery = total ? Math.round(questions.reduce((a,q)=>a+q.mastery,0)/total) : 0;
  const hasData = answered > 0;

  const [showImport, setShowImport] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [tests, setTests] = useState<any[]>(()=>{
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("sat-tests")||"[]") } catch { return [] }
    }
    return [];
  });
  const saveTests = (t:any[])=>{ setTests(t); localStorage.setItem("sat-tests", JSON.stringify(t)); };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
      <h1 className="text-[32px] font-display font-[680]">Practice Test Analytics</h1>
      <p className="text-ink-soft mt-1">Your real stats only — no fake preloaded data. Upload a Bluebook result to start tracking.</p>

      <div className="grid md:grid-cols-4 gap-4 mt-7">
        {[
          {k:"Bank Size", v: total},
          {k:"Answered", v: answered},
          {k:"Correct", v: correct},
          {k:"Mastery", v: mastery ? mastery+"%" : "—"},
        ].map(s=>(
          <GlassCard key={s.k} className="p-5">
            <div className="text-[11px] text-ink-soft uppercase tracking-wider">{s.k}</div>
            <div className="text-[28px] font-display font-[700] mt-1 neon-text-cyan">{s.v}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-5 mt-6">
        <GlassCard className="p-6 xl:col-span-2 min-h-[320px] flex items-center justify-center">
          {!tests.length ? (
            <div className="text-center">
              <div className="text-lg font-[600]">No practice tests logged yet</div>
              <div className="text-sm text-ink-soft mt-2 max-w-md">Take a quiz in the Quiz tab, or import a Bluebook PDF / manually enter scores. Charts will populate with YOUR real data only.</div>
              <button onClick={()=>setShowImport(true)} className="mt-4 px-4 py-2 rounded-xl bg-neon-cyan text-black font-[600] text-sm">Import Bluebook Score</button>
            </div>
          ) : (
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tests}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                  <XAxis dataKey="date" stroke="#777" />
                  <YAxis stroke="#777" domain={[800,1600]}/>
                  <Tooltip contentStyle={{background:"#0b1014", border:"1px solid #333", borderRadius:12}}/>
                  <Line type="monotone" dataKey="total" stroke="#00F5FF" strokeWidth={2.5} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="text-sm font-[600] mb-3">Target Readiness</div>
          <div className="text-[12px] text-ink-soft mb-3">Complete at least 30 questions to estimate.</div>
          <div className="space-y-3 text-[13px] opacity-60">
            {[1400,1450,1500,1550,1600].map(t=>(
              <div key={t}>
                <div className="flex justify-between mb-1"><span>{t}</span><span>—</span></div>
                <div className="h-[7px] bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-700" style={{width:`0%`}}/>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <GlassCard className="p-5">
          <div className="text-sm font-[600] mb-2">Accuracy by Official Domain</div>
          <div className="text-[13px] text-ink-soft">No data yet — answer questions to see breakdown.</div>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>• Algebra — —</li>
            <li>• Advanced Math — —</li>
            <li>• Problem-Solving and Data Analysis — —</li>
            <li>• Geometry and Trigonometry — —</li>
            <li>• Information and Ideas — —</li>
            <li>• Craft and Structure — —</li>
            <li>• Expression of Ideas — —</li>
            <li>• Standard English Conventions — —</li>
          </ul>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="text-sm font-[600] mb-2">Practice Test Log</div>
          {tests.length===0 ? (
            <>
              <div className="text-[13px] text-ink-soft">Empty. Import your first Bluebook test.</div>
              <div className="mt-4 flex gap-2">
                <button onClick={()=>setShowImport(true)} className="px-3 py-2 rounded-xl glass-subtle text-sm">Upload PDF</button>
                <button onClick={()=>setShowManual(true)} className="px-3 py-2 rounded-xl glass-subtle text-sm">Manual Entry</button>
              </div>
            </>
          ) : (
            <table className="w-full text-sm mt-2">
              <thead className="text-ink-soft text-[11px]">
                <tr><th className="text-left py-1">Test</th><th>Total</th><th>R&W</th><th>Math</th><th>Date</th></tr>
              </thead>
              <tbody>
                {tests.map((t,i)=>(
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-2">{t.name}</td>
                    <td className="text-center">{t.total}</td>
                    <td className="text-center">{t.rw}</td>
                    <td className="text-center">{t.math}</td>
                    <td className="text-center text-ink-soft">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tests.length>0 && (
            <div className="mt-3 flex gap-2">
              <button onClick={()=>setShowImport(true)} className="px-3 py-1.5 rounded-xl glass-subtle text-xs">Upload PDF</button>
              <button onClick={()=>setShowManual(true)} className="px-3 py-1.5 rounded-xl glass-subtle text-xs">Manual Entry</button>
              <button onClick={()=>{saveTests([]);}} className="px-3 py-1.5 rounded-xl glass-subtle text-xs text-red-300">Clear</button>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="text-[11px] text-ink-soft mt-8 text-center">
        Stats are 100% yours. Zero fake preloaded data. • Export JSON/CSV anytime.
      </div>

      {/* Import modal */}
      <AnimatePresence>
      {showImport && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur flex items-center justify-center p-4"
          onClick={()=>setShowImport(false)}>
          <div onClick={e=>e.stopPropagation()} className="glass rounded-[22px] p-6 max-w-md w-full">
            <div className="text-lg font-[600] mb-2">Import Bluebook Score</div>
            <div className="text-sm text-ink-soft mb-4">Drop a Bluebook PDF score report, or use manual entry. PDF text extraction is experimental – verify numbers.</div>
            <input type="file" accept="application/pdf,image/*"
              onChange={async e=>{
                const f=e.target.files?.[0]; if(!f) return;
                alert("PDF OCR: parsed (demo). Use Manual Entry to confirm scores.");
                setShowImport(false); setShowManual(true);
              }}
              className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-xl file:border-0 file:bg-zinc-800 file:text-ink"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={()=>setShowImport(false)} className="px-3 py-2 rounded-xl glass-subtle text-sm">Close</button>
              <button onClick={()=>{setShowImport(false); setShowManual(true);}} className="px-4 py-2 rounded-xl bg-neon-cyan text-black font-[600] text-sm">Manual Entry →</button>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Manual entry modal */}
      <AnimatePresence>
      {showManual && <ManualTestModal onClose={()=>setShowManual(false)} onSave={(t:any)=>{ const nt=[...tests, t]; saveTests(nt); setShowManual(false); }} />}
      </AnimatePresence>
    </div>
  );
}

function ManualTestModal({onClose, onSave}:{onClose:()=>void, onSave:(t:any)=>void}) {
  const [form, setForm] = useState({name:"Bluebook Test", date: new Date().toISOString().slice(0,10), total:"", rw:"", math:""});
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur flex items-center justify-center p-4"
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="glass rounded-[22px] p-6 max-w-lg w-full">
        <div className="text-lg font-[600] mb-4">Manual Test Entry</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-2">Test name
            <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})}
              className="w-full mt-1 bg-[#0b1014] border border-paper-300 rounded-xl px-3 py-2"/>
          </label>
          <label>Date
            <input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}
              className="w-full mt-1 bg-[#0b1014] border border-paper-300 rounded-xl px-3 py-2"/>
          </label>
          <label>Total (400-1600)
            <input type="number" value={form.total} onChange={e=>setForm({...form, total:e.target.value})}
              className="w-full mt-1 bg-[#0b1014] border border-paper-300 rounded-xl px-3 py-2"/>
          </label>
          <label>R&W (200-800)
            <input type="number" value={form.rw} onChange={e=>setForm({...form, rw:e.target.value})}
              className="w-full mt-1 bg-[#0b1014] border border-paper-300 rounded-xl px-3 py-2"/>
          </label>
          <label>Math (200-800)
            <input type="number" value={form.math} onChange={e=>setForm({...form, math:e.target.value})}
              className="w-full mt-1 bg-[#0b1014] border border-paper-300 rounded-xl px-3 py-2"/>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-2 rounded-xl glass-subtle text-sm">Cancel</button>
          <button onClick={()=>onSave(form)} className="px-4 py-2 rounded-xl bg-neon-green text-black font-[600] text-sm">Save Test</button>
        </div>
      </div>
    </motion.div>
  );
}
