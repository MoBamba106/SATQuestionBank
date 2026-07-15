"use client";
import { SATQuestion } from "@/lib/types";
import { GlassCard } from "./ui/glass-card";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useMemo, useState } from "react";
import { useBank } from "@/lib/store";
import { QuestionHistoryModal } from "./question-history-modal";

const diffColor: Record<string,string> = {
  "Easy": "text-[#15803d] bg-[#ecfdf5] border-[#a7f3d0]",
  "Medium": "text-[#1d4ed8] bg-[#eff6ff] border-[#bfdbfe]",
  "Hard": "text-[#b45309] bg-[#fffbeb] border-[#fde68a]",
  "Very Hard": "text-[#be185d] bg-[#fff1f2] border-[#fecdd3]"
};

function decodeEntities(s:string){
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, """).replace(/&ldquo;/g, """)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_,n)=>String.fromCharCode(parseInt(n,10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_,h)=>String.fromCharCode(parseInt(h,16)));
}

function stripHtml(s?:string){
  if(!s) return "";
  // decode repeatedly to handle double-encoding
  let t = s;
  for (let i=0;i<3;i++){
    const next = decodeEntities(t);
    if (next===t) break;
    t = next;
  }
  // strip tags
  t = t.replace(/<[^>]+>/g, " ");
  // strip any leftover entities
  t = decodeEntities(t);
  t = t.replace(/&[a-z0-9#]+;/gi, " ");
  return t.replace(/\s+/g," ").trim();
}

function QuestionCardInner({ q, onOpen }: { q: SATQuestion; onOpen?: ()=>void }) {
  const clean = useMemo(()=> stripHtml(q.questionText).slice(0,180), [q.questionText]);
  const date = useMemo(()=> { try { return new Date(q.createdAt).toLocaleDateString('en-CA') } catch { return "" } }, [q.createdAt]);
  const { toggleFavorite } = useBank();
  const [showHistory, setShowHistory] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(q.id);
  };

  const handleHistoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHistory(true);
  };

  return (
    <>
      <GlassCard className="p-[18px] cursor-pointer group relative" onClick={onOpen} hover>
        <div className="flex items-start justify-between gap-2 mb-[10px]">
          <div className="text-[11px] font-mono text-ink-faint truncate max-w-[100px]">{q.id}</div>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[11px] px-2 py-[3px] rounded-full border font-500", diffColor[q.difficulty] || "text-ink-soft bg-paper-200 border-paper-300")}>
              {q.difficulty}
            </span>
            {/* Favorite Star */}
            <button
              onClick={handleFavoriteClick}
              className="transition-transform hover:scale-125 active:scale-95"
              title={q.favorite ? "Remove favorite" : "Add to favorites"}
            >
              {q.favorite ? (
                <Star size={16} className="text-[#eab308] animate-pulse" fill="#fef08a" />
              ) : (
                <Star size={16} className="text-gray-400 hover:text-[#eab308]" />
              )}
            </button>
          </div>
        </div>

        <div className="text-[14px] text-ink leading-[1.55] h-[66px] overflow-hidden">
          {clean}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] min-h-[28px]">
          <span className="px-2.5 py-1 rounded-full bg-[#f7f3ea] text-ink-soft border border-paper-300 truncate max-w-full">{q.skill}</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-ink-faint border-t border-paper-300 pt-[10px]">
          <span className="truncate">{q.domain}</span>
          <button
            onClick={handleHistoryClick}
            className="text-blue-400 hover:text-blue-300 transition-colors"
            title="View attempt history"
          >
            {q.timesAnswered > 0 ? `${q.timesAnswered}x • ${q.mastery}%` : "No attempts"}
          </button>
          <span>{date}</span>
        </div>
      </GlassCard>

      {/* History Modal */}
      <QuestionHistoryModal
        question={q}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}

export const QuestionCard = React.memo(QuestionCardInner);
