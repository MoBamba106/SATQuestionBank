"use client";
import { SATQuestion } from "@/lib/types";
import { useBank } from "@/lib/store";
import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export function QuestionEditor({ q, onClose }: { q: SATQuestion; onClose: ()=>void }) {
  const upsert = useBank(s=>s.upsert);
  const remove = useBank(s=>s.remove);
  const [form, setForm] = useState<SATQuestion>({...q});
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{opacity:0, y:20, scale:.98}} animate={{opacity:1, y:0, scale:1}}
        className="w-full max-w-4xl glass rounded-[24px] p-6 max-h-[90vh] overflow-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] text-ink-faint font-mono">{form.id}</div>
            <div className="text-xl font-display font-[620]">Edit Question</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl glass-subtle"><X size={18}/></button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="md:col-span-2">
            <div className="text-[11px] text-ink-faint mb-1 uppercase tracking-wider">Question Text</div>
            <textarea value={form.questionText} onChange={e=>setForm({...form, questionText: e.target.value})}
              className="w-full h-36 bg-white border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
          {form.choices?.map((c,i)=>(
            <label key={c.key}>
              <div className="text-[11px] text-ink-faint mb-1">{c.key}</div>
              <input value={c.text}
                onChange={e=>{
                  const choices=[...(form.choices||[])];
                  choices[i] = {...choices[i], text:e.target.value};
                  setForm({...form, choices});
                }}
                className="w-full bg-white border border-paper-300 rounded-xl p-3 text-sm"/>
            </label>
          ))}
          <label>
            <div className="text-[11px] text-ink-faint mb-1">Correct Answer</div>
            <input value={form.correctAnswer} onChange={e=>setForm({...form, correctAnswer:e.target.value})}
              className="w-full bg-white border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
          <label>
            <div className="text-[11px] text-ink-faint mb-1">Difficulty</div>
            <select value={form.difficulty} onChange={e=>setForm({...form, difficulty: e.target.value as any})}
              className="w-full bg-white border border-paper-300 rounded-xl p-3 text-sm">
              <option>Easy</option><option>Medium</option><option>Hard</option><option>Very Hard</option>
            </select>
          </label>
          <label>
            <div className="text-[11px] text-ink-faint mb-1">Domain</div>
            <select value={form.domain} onChange={e=>setForm({...form, domain: e.target.value as any})}
              className="w-full bg-white border border-paper-300 rounded-xl p-3 text-sm">
              <option>Math</option><option>Reading & Writing</option>
            </select>
          </label>
          <label>
            <div className="text-[11px] text-ink-faint mb-1">Skill</div>
            <input value={form.skill} onChange={e=>setForm({...form, skill:e.target.value})}
              className="w-full bg-white border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
          <label className="md:col-span-2">
            <div className="text-[11px] text-ink-faint mb-1">Explanation</div>
            <textarea value={form.explanation} onChange={e=>setForm({...form, explanation:e.target.value})}
              className="w-full h-28 bg-white border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
        </div>
        <div className="flex justify-between gap-2 mt-5">
          <button onClick={()=>{ if(confirm(`Delete ${form.id}?`)){ remove(form.id); onClose(); }}}
            className="px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm">Delete question</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl glass-subtle">Cancel</button>
            <button onClick={()=>{ upsert(form); onClose(); }}
              className="px-5 py-2 rounded-xl bg-neon-cyan text-black font-[600]">Save</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
