"use client";
import { useBank } from "@/lib/store";
import { useMemo, useState, useEffect, useDeferredValue } from "react";
import { QuestionCard } from "@/components/question-card";
import { SAT_DOMAINS, DIFFICULTIES } from "@/lib/sat-categories";
import { Search, Play } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { QuestionEditor } from "@/components/question-editor";
import { SATQuestion } from "@/lib/types";

const PAGE_SIZE = 48;

export default function BankPage() {
  const { questions, upsert, syncFromServer, clearSynthetic, remove, setCustomQuizPool, toggleFavorite } = useBank();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [domain, setDomain] = useState<string>("All");
  const [skill, setSkill] = useState<string>("All");
  const [diff, setDiff] = useState<string>("All");
  const [open, setOpen] = useState<SATQuestion | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // auto-sync once
  useEffect(()=>{ syncFromServer(); }, [syncFromServer]);

  const filtered = useMemo(()=>{
    const needle = deferredQ.toLowerCase().trim();
    return questions.filter(item=>{
      if (needle && !(item.id.toLowerCase().includes(needle) || item.skill.toLowerCase().includes(needle) || (item.questionText||"").toLowerCase().includes(needle))) return false;
      if (domain!=="All" && item.domain!==domain) return false;
      if (skill!=="All" && item.skill!==skill) return false;
      if (diff!=="All" && item.difficulty!==diff) return false;
      if (showFavoritesOnly && !item.favorite) return false;
      return true;
    });
  }, [questions, deferredQ, domain, skill, diff, showFavoritesOnly]);

  useEffect(()=>{ setPage(1); }, [deferredQ, domain, skill, diff]);

  const skills = domain==="All" ? [] : [...(SAT_DOMAINS as any)[domain]];
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(()=> filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE), [filtered, page]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const startCustomQuiz = () => {
    if (selectedIds.length === 0) return;
    setCustomQuizPool(selectedIds);          // store IDs only
    window.location.href = "/quiz";
  };

  return (
    <div className="px-5 md:px-8 lg:px-10 py-7 max-w-[1440px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[30px] md:text-[34px] font-display font-[650] tracking-tight text-ink">Question Bank</h1>
          <div className="text-[13px] text-ink-soft mt-1">
            {filtered.length.toLocaleString()} / {questions.length.toLocaleString()} • College Board official • v7 fast
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <button onClick={async () => {
            const n = await syncFromServer();
            alert(`Synced ${n} questions from server.`);
          }}
            className="px-3 py-[8px] rounded-xl bg-white border border-paper-300 hover:border-[#b8a98a] text-ink-soft shadow-sm">Sync DB</button>
          <button onClick={clearSynthetic}
            className="px-3 py-[8px] rounded-xl bg-white border border-paper-300 text-ink-soft">Clean</button>
          <button onClick={()=>setManualOpen(true)}
            className="px-4 py-[9px] rounded-[12px] bg-[#3a6fe3] text-white font-[600] shadow-paper">+ Add Question</button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#f0e9d8] border border-[#c9b68a] px-5 py-3">
          <div className="text-sm font-medium text-ink">
            {selectedIds.length} question{selectedIds.length > 1 ? "s" : ""} selected
          </div>
          <div className="flex gap-2">
            <button onClick={clearSelection} className="px-4 py-1.5 text-sm rounded-xl bg-white border">Clear</button>
            <button onClick={startCustomQuiz} className="px-5 py-1.5 text-sm rounded-xl bg-[#3a6fe3] text-white flex items-center gap-2 font-semibold">
              <Play size={15}/> Quiz Selected
            </button>
          </div>
        </div>
      )}

      <GlassCard className="p-[14px] mb-5">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"/>
            <input
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Search ID, skill, text… (debounced)"
              className="w-full bg-white border border-paper-300 rounded-[12px] pl-9 pr-3 py-[10px] text-[14px] text-ink outline-none focus:border-[#7aa8ff] focus:ring-2 focus:ring-[#7aa8ff]/18"
            />
          </div>
          <select value={domain} onChange={e=>{setDomain(e.target.value); setSkill("All")}}
            className="bg-white border border-paper-300 rounded-[12px] px-4 py-[10px] text-[13px] text-ink focus:outline-none focus:border-[#7aa8ff] focus:ring-2 focus:ring-[#7aa8ff]/20 shadow-sm hover:border-[#c9c4b5]">
            <option>All Domains</option>
            <option>Math</option>
            <option>Reading & Writing</option>
          </select>
          <select value={skill} onChange={e=>setSkill(e.target.value)}
            className="bg-white border border-paper-300 rounded-[12px] px-4 py-[10px] text-[13px] text-ink min-w-[200px] focus:outline-none focus:border-[#7aa8ff] focus:ring-2 focus:ring-[#7aa8ff]/20 shadow-sm hover:border-[#c9c4b5]">
            <option>All Skills</option>
            {skills.map(s=> <option key={s}>{s}</option>)}
          </select>
          <select value={diff} onChange={e=>setDiff(e.target.value)}
            className="bg-white border border-paper-300 rounded-[12px] px-4 py-[10px] text-[13px] text-ink focus:outline-none focus:border-[#7aa8ff] focus:ring-2 focus:ring-[#7aa8ff]/20 shadow-sm hover:border-[#c9c4b5]">
            <option>All Levels</option>
            {DIFFICULTIES.map(d=> <option key={d}>{d}</option>)}
          </select>
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-4 py-[10px] text-[13px] rounded-[12px] border flex items-center gap-1.5 ${showFavoritesOnly ? 'bg-[#fef08a] border-[#eab308] text-[#854d0e]' : 'bg-white border-paper-300 text-ink-soft'}`}>
            <span>⭐</span> {showFavoritesOnly ? 'Favorites only' : 'Show Favorites'}
          </button>
        </div>
      </GlassCard>

      {/* virtualized grid – paginated for speed */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pageItems.map(item=>(
          <div key={item.id} className="relative group">
            <QuestionCard q={item} onOpen={()=>setOpen(item)} />
            <button 
              onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
              className={`absolute top-3 right-3 px-3 py-1 text-xs rounded-full font-medium transition-all z-10 shadow-sm
                ${selectedIds.includes(item.id) 
                  ? "bg-[#3a6fe3] text-white" 
                  : "bg-white border border-paper-300 text-ink-soft hover:bg-[#f7f3ea]"}`}>
              {selectedIds.includes(item.id) ? "Selected" : "Select"}
            </button>
          </div>
        ))}
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between mt-6 text-[13px]">
        <div className="text-ink-soft">
          Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5">
          <button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}
            className="px-3 py-1.5 rounded-lg bg-white border border-paper-300 disabled:opacity-40 text-ink">‹ Prev</button>
          <span className="px-2 text-ink-soft tabular-nums">{page} / {totalPages}</span>
          <button disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
            className="px-3 py-1.5 rounded-lg bg-white border border-paper-300 disabled:opacity-40 text-ink">Next ›</button>
        </div>
      </div>

      <div className="text-[11px] text-ink-faint text-center mt-8">
        v7 • virtualized pagination • memoized cards • 0 animation bloat • 20k+ ready
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
