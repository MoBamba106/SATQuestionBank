"use client";
import { SATQuestion } from "@/lib/types";
import { GlassCard } from "./ui/glass-card";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const diffColor: Record<string,string> = {
  "Easy": "text-[#2ca974] bg-[#e8f7ef] border-[#b9e8d0]",
  "Medium": "text-[#3a6fe3] bg-[#eaf1ff] border-[#c3d8ff]",
  "Hard": "text-[#c28a00] bg-[#fff7d6] border-[#f5e2a0]",
  "Very Hard": "text-[#d64a6a] bg-[#ffe6ec] border-[#ffc2d2]"
};

function stripHtml(s?:string){ if(!s) return ""; const tmp = typeof window !== "undefined" ? document.createElement("div") : null; if(tmp){ tmp.innerHTML = s; return tmp.textContent || tmp.innerText || ""; } return s.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(); }

export function QuestionCard({ q, onOpen }: { q: SATQuestion; onOpen?: ()=>void }) {
  const clean = stripHtml(q.questionText).slice(0,220);
  return (
    <GlassCard className="p-5 cursor-pointer group hover:shadow-paper-lg transition-all" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="text-[11px] font-mono text-ink-faint">{q.id}</div>
        <div className="flex gap-1.5 items-center">
          <span className={cn("text-[11px] px-2.5 py-1 rounded-full border font-[500]", diffColor[q.difficulty] || "text-ink-soft bg-paper-200 border-paper-300")}>
            {q.difficulty}
          </span>
          {q.favorite && <Star size={14} className="text-[#f2c84b] fill-[#fff3a3]" />}
        </div>
      </div>
      <div className="text-[14px] text-ink leading-relaxed line-clamp-3 min-h-[62px]">
        {clean || "Question preview…"}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
        <span className="px-2.5 py-1 rounded-full bg-[#f7f3ea] text-ink-soft border border-paper-300">{q.skill}</span>
        <span className="px-2.5 py-1 rounded-full bg-[#fdfcfa] text-ink-faint border border-paper-300">{q.subskill}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] text-ink-faint">
        <span>{q.domain}</span>
        <span>{q.source?.includes("College Board") ? "CB Official" : (q.source || "—")}</span>
        <span>{new Date(q.createdAt).toLocaleDateString('en-CA')}</span>
      </div>
    </GlassCard>
  );
}
