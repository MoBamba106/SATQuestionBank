"use client";
import { SATQuestion } from "@/lib/types";
import { useBank } from "@/lib/store";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function QuestionEditor({ q, onClose }: { q: SATQuestion; onClose: ()=>void }) {
  const upsert = useBank(s=>s.upsert);
  const remove = useBank(s=>s.remove);
  const attempts = useBank(s=>s.attempts.filter(a => a.questionId === q.id));
  const note = useBank(s=>s.questionNotes[q.id] || "");
  const isFavorite = useBank(s=>!!s.questions.find(x=>x.id===q.id)?.favorite);
  const setQuestionNote = useBank(s=>s.setQuestionNote);
  const toggleFavorite = useBank(s=>s.toggleFavorite);
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
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-ink-soft">
          <button onClick={()=>toggleFavorite(form.id)} className="px-3 py-1.5 rounded-xl bg-white border border-paper-300 text-ink flex items-center gap-1.5">
            <Star size={13} fill={isFavorite ? "#f7d35c" : "none"} className={isFavorite ? "text-[#b8870a]" : "text-ink-soft"} />
            {isFavorite ? "Favorited" : "Favorite"}
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-white border border-paper-300">
            Answered {attempts.length} times
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="md:col-span-2">
            <div className="text-[11px] text-ink-faint mb-1 uppercase tracking-wider">Question Text (HTML allowed)</div>
            <textarea value={form.questionText} onChange={e=>setForm({...form, questionText: e.target.value})}
              className="w-full h-36 bg-white text-ink border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
          <label className="md:col-span-2">
            <div className="text-[11px] text-ink-faint mb-1 uppercase tracking-wider">Passage (R&W only)</div>
            <textarea value={form.passage||""} onChange={e=>setForm({...form, passage: e.target.value})}
              className="w-full h-24 bg-white text-ink border border-paper-300 rounded-xl p-3 text-sm"/>
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
                className="w-full bg-white text-ink border border-paper-300 rounded-xl p-3 text-sm"/>
            </label>
          ))}
          <label>
            <div className="text-[11px] text-ink-faint mb-1">Correct Answer</div>
            <input value={form.correctAnswer} onChange={e=>setForm({...form, correctAnswer:e.target.value})}
              className="w-full bg-white text-ink border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
          <label>
            <div className="text-[11px] text-ink-faint mb-1">Difficulty</div>
            <Select value={form.difficulty} onValueChange={(value)=>setForm({...form, difficulty: value as any})}>
              <SelectTrigger className="h-[46px] text-sm">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
                <SelectItem value="Very Hard">Very Hard</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label>
            <div className="text-[11px] text-ink-faint mb-1">Domain</div>
            <Select value={form.domain} onValueChange={(value)=>setForm({...form, domain: value as any})}>
              <SelectTrigger className="h-[46px] text-sm">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Math">Math</SelectItem>
                <SelectItem value="Reading & Writing">Reading & Writing</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label>
            <div className="text-[11px] text-ink-faint mb-1">Skill</div>
            <input value={form.skill} onChange={e=>setForm({...form, skill:e.target.value})}
              className="w-full bg-white text-ink border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
          <label className="md:col-span-2">
            <div className="text-[11px] text-ink-faint mb-1">Explanation (HTML allowed)</div>
            <textarea value={form.explanation} onChange={e=>setForm({...form, explanation:e.target.value})}
              className="w-full h-28 bg-white text-ink border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
          <label className="md:col-span-2">
            <div className="text-[11px] text-ink-faint mb-1">Question Notes</div>
            <textarea value={note} onChange={e=>setQuestionNote(form.id, e.target.value)}
              placeholder="Add your study note for this question..."
              className="w-full h-24 bg-white text-ink border border-paper-300 rounded-xl p-3 text-sm"/>
          </label>
          <div className="md:col-span-2">
            <div className="text-[11px] text-ink-faint mb-1">History</div>
            <div className="bg-white border border-paper-300 rounded-xl p-3 text-xs text-ink-soft">
              {!attempts.length ? "No attempts yet." : attempts.slice(-12).map(a => a.isCorrect ? "✓" : "✗").join(" ")}
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-2 mt-5">
          <button onClick={()=>{ if(confirm(`Delete ${form.id}?`)){ remove(form.id); onClose(); }}}
            className="px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm">Delete question</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl glass-subtle text-ink">Cancel</button>
            <button onClick={()=>{ upsert(form); onClose(); }}
              className="px-5 py-2 rounded-xl bg-[#3a6fe3] text-white font-[600]">Save</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
