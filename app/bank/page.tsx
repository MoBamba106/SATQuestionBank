"use client";
import { useBank } from "@/lib/store";
import { useMemo, useState } from "react";
import { QuestionCard } from "@/components/question-card";
import { SAT_DOMAINS, DIFFICULTIES } from "@/lib/sat-categories";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { QuestionEditor } from "@/components/question-editor";
import { SATQuestion } from "@/lib/types";

export default function BankPage() {
  const { questions, upsert, syncFromServer, clearSynthetic } = useBank();
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<string>("All");
  const [skill, setSkill] = useState<string>("All");
  const [diff, setDiff] = useState<string>("All");
  const [open, setOpen] = useState<SATQuestion | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const filtered = useMemo(()=>{
    return questions.filter(item=>{
      if (q && !(`${item.questionText} ${item.id} ${item.skill}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (domain!=="All" && item.domain!==domain) return false;
      if (skill!=="All" && item.skill!==skill) return false;
      if (diff!=="All" && item.difficulty!==diff) return false;
      return true;
    });
  }, [questions, q, domain, skill, diff]);

  const skills = domain==="All" ? [] :
    [...(SAT_DOMAINS as any)[domain]];

  return (
    <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="text-[32px] font-display font-[680] tracking-tight">Question Bank</h1>
          <div className="text-ink-soft text-sm mt-1">{filtered.length} / {questions.length} questions • official College Board taxonomy • 0 fake stats</div>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <button onClick={async()=>{ const n=await syncFromServer(); alert(`Synced from server – ${n} questions`); }}
            className="px-3 py-[8px] rounded-xl glass-subtle hover:border-neon-cyan/40">Sync from DB</button>
          <button onClick={clearSynthetic}
            className="px-3 py-[8px] rounded-xl glass-subtle hover:border-neon-pink/40">Remove synthetic</button>
          <button onClick={()=>setManualOpen(true)}
            className="px-4 py-[9px] rounded-xl bg-neon-cyan text-black font-[600]">+ Manual Add</button>
        </div>
      </div>

      <GlassCard className="p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Live filter: ID, text, skill…"
              className="w-full bg-[#0c1013] border border-paper-300 rounded-xl pl-9 pr-3 py-[11px] text-sm outline-none focus:border-neon-cyan/50"/>
          </div>
          <select value={domain} onChange={e=>{setDomain(e.target.value); setSkill("All")}} className="bg-[#0c1013] border border-paper-300 rounded-xl px-3 py-[11px] text-sm">
            <option>All</option>
            <option>Math</option>
            <option>Reading & Writing</option>
          </select>
          <select value={skill} onChange={e=>setSkill(e.target.value)} className="bg-[#0c1013] border border-paper-300 rounded-xl px-3 py-[11px] text-sm min-w-[220px]">
            <option>All</option>
            {skills.map(s=> <option key={s}>{s}</option>)}
          </select>
          <select value={diff} onChange={e=>setDiff(e.target.value)} className="bg-[#0c1013] border border-paper-300 rounded-xl px-3 py-[11px] text-sm">
            <option>All</option>
            {DIFFICULTIES.map(d=> <option key={d}>{d}</option>)}
          </select>
        </div>
      </GlassCard>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map(item=>(
          <QuestionCard key={item.id} q={item} onOpen={()=>setOpen(item)} />
        ))}
      </div>

      {open && <QuestionEditor q={open} onClose={()=>setOpen(null)} />}
      {manualOpen && <QuestionEditor q={{
        id: `manual-${Math.random().toString(36).slice(2,8)}`,
        questionText: "",
        passage: null,
        imageUrl: null,
        mathExpression: null,
        choices: [
          {key:"A",text:""},{key:"B",text:""},{key:"C",text:""},{key:"D",text:""}
        ],
        correctAnswer: "",
        explanation: "",
        difficulty: "Medium",
        domain: "Math",
        skill: "Algebra",
        subskill: "",
        source: "Manual",
        tags: [],
        timesAnswered:0, timesCorrect:0, mastery:0,
        createdAt: new Date().toISOString(),
        type: "multiple_choice",
        favorite: false
      } as any} onClose={()=>setManualOpen(false)} />}
    </div>
  );
}
