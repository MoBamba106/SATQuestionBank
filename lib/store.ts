"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SATQuestion } from "./types";
import { SEED_QUESTIONS } from "./mock-data";

type BankState = {
  questions: SATQuestion[];
  setQuestions: (q:SATQuestion[])=>void;
  upsert: (q:SATQuestion)=>void;
  remove: (id:string)=>void;
  clearSynthetic: ()=>void;
  syncFromServer: ()=>Promise<number>;
};

export const useBank = create<BankState>()(
  persist(
    (set, get) => ({
      questions: SEED_QUESTIONS,
      setQuestions: (questions) => set({ questions }),
      upsert: (q) => set(state => {
        const idx = state.questions.findIndex(x=>x.id===q.id);
        if (idx>=0) {
          const copy=[...state.questions]; copy[idx]=q; return { questions: copy };
        }
        return { questions: [q, ...state.questions] };
      }),
      remove: (id)=> set(s=>({ questions: s.questions.filter(x=>x.id!==id)})),
      clearSynthetic: () => set(s=>({
        questions: s.questions.filter(q=> !q.id.startsWith("syn-") && !/^syn/.test(q.id))
      })),
      syncFromServer: async () => {
        try {
          const res = await fetch("/api/questions", { cache: "no-store" });
          if (!res.ok) return get().questions.length;
          const data = await res.json();
          if (Array.isArray(data) && data.length > get().questions.length) {
            // normalize choices/tags if stringified
            const norm = data.map((q:any)=>({
              ...q,
              choices: typeof q.choices === "string" ? JSON.parse(q.choices) : q.choices,
              tags: typeof q.tags === "string" ? JSON.parse(q.tags) : (q.tags||[]),
              timesAnswered: q.timesAnswered ?? 0,
              timesCorrect: q.timesCorrect ?? 0,
              mastery: q.mastery ?? 0,
            }));
            set({ questions: norm });
            return norm.length;
          }
          return get().questions.length;
        } catch { return get().questions.length; }
      }
    }),
    {
      name: "sat-nexus-bank-v4",
      storage: createJSONStorage(()=>localStorage),
      version: 4,
      migrate: (persisted:any, version:number)=>{
        // wipe synthetic on any old version
        if (persisted?.state?.questions) {
          persisted.state.questions = persisted.state.questions.filter((q:any)=> !String(q.id).startsWith("syn-"));
          // zero fake stats
          persisted.state.questions = persisted.state.questions.map((q:any)=>({
            ...q,
            timesAnswered: 0,
            timesCorrect: 0,
            mastery: 0,
            avgResponseMs: undefined,
            lastReviewed: null,
            favorite: false
          }));
        }
        return persisted;
      },
      partialize: (s)=>({ questions: s.questions })
    }
  )
);

// auto-clean synthetic on import (client)
if (typeof window !== "undefined") {
  setTimeout(()=>{
    try {
      const st = useBank.getState();
      const hasSyn = st.questions.some(q=>q.id.startsWith("syn-"));
      if (hasSyn) st.clearSynthetic();
    } catch {}
  }, 50);
}
