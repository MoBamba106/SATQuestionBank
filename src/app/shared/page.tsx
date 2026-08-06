"use client";
import { formatDetroitDate, formatDetroitDateTime } from "@/lib/utils";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Share2, Trash2, Play, Clock, UserRound, FolderOpen, Inbox } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi, apiDelete } from "@/lib/api-client";
import { launchPoolQuiz } from "@/lib/quiz-session";
import { toast } from "sonner";
import { cn, skillColor, domainColor, difficultyColor, stripHtml } from "@/lib/utils";
import { RequireAccount } from "@/components/require-account";
import type { SATQuestion } from "@/lib/types";

type SharedQuestionRow = {
  id: string;
  questionId: string;
  createdAt: string;
  expiresAt: string;
  fromId: string;
  fromEmail: string | null;
  fromDisplayName: string | null;
  question_text: string;
  question_html: string | null;
  domain: string;
  skill: string;
  difficulty: string;
  type: string;
  choices: unknown;
};

type SharedCollectionRow = {
  id: string;
  collectionId: string;
  createdAt: string;
  fromId: string;
  fromEmail: string | null;
  fromDisplayName: string | null;
  name: string;
  description: string | null;
  icon: string;
  questionCount: number;
};

function SharedPageInner() {
  const router = useRouter();
  const [tab, setTab] = React.useState<"questions" | "collections">("questions");

  const { data: qData, loading: qLoading, reload: reloadQ } = useApi<{ received: SharedQuestionRow[]; sent: SharedQuestionRow[] }>("/api/shared-questions", "shared-questions");
  const { data: cData, loading: cLoading, reload: reloadC } = useApi<{ received: SharedCollectionRow[]; sent: SharedCollectionRow[] }>("/api/shared-collections", "shared-collections");

  const openQuestionQuiz = (qId: string, label?: string) => {
    launchPoolQuiz(router, { label: label || `Shared question ${qId.slice(0, 6)}`, ids: [qId], mode: "practice" });
  };

  const openCollectionQuiz = async (collectionId: string, name: string, idsFromRow?: string[]) => {
    try {
      let ids: string[] = idsFromRow ?? [];
      if (ids.length === 0) {
        // fallback try shared collections data
        const row = cData?.received.find((r) => r.collectionId === collectionId) as any;
        if (row?.questionIds && Array.isArray(row.questionIds)) ids = row.questionIds;
      }
      if (ids.length === 0) {
        toast.error("Collection is empty or could not be loaded");
        return;
      }
      launchPoolQuiz(router, { label: `Shared collection: ${name}`, ids, mode: "collection" });
    } catch (e) {
      toast.error("Couldn't open collection", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const deleteSharedQ = async (id: string) => {
    try {
      await apiDelete(`/api/shared-questions?id=${encodeURIComponent(id)}`);
      toast.success("Removed shared question");
      reloadQ();
    } catch (e) {
      toast.error("Couldn't delete", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const deleteSharedC = async (id: string) => {
    try {
      await apiDelete(`/api/shared-collections?id=${encodeURIComponent(id)}`);
      toast.success("Removed shared collection");
      reloadC();
    } catch (e) {
      toast.error("Couldn't delete", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const receivedQs = qData?.received ?? [];
  const sentQs = qData?.sent ?? [];
  const receivedCs = cData?.received ?? [];
  const sentCs = cData?.sent ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Collaboration</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Shared Questions</h1>
          <p className="mt-1 text-[14px] text-[var(--ink-faint)]">Questions and collections sent to you by other students. Shared questions expire after 3 days.</p>
        </div>
      </div>

      <div className="flex gap-1.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-soft)] p-1.5">
        <button type="button" onClick={() => setTab("questions")} className={cn("min-h-10 grow rounded-[7px] px-4 text-[13.5px] font-bold sm:grow-0", tab === "questions" ? "bg-[var(--paper-raised)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--line)]" : "text-[var(--ink-faint)]")}>
          <Share2 className="mr-2 inline h-4 w-4" /> Questions ({receivedQs.length})
        </button>
        <button type="button" onClick={() => setTab("collections")} className={cn("min-h-10 grow rounded-[7px] px-4 text-[13.5px] font-bold sm:grow-0", tab === "collections" ? "bg-[var(--paper-raised)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--line)]" : "text-[var(--ink-faint)]")}>
          <FolderOpen className="mr-2 inline h-4 w-4" /> Collections ({receivedCs.length})
        </button>
      </div>

      {tab === "questions" && (
        <div className="space-y-5">
          {qLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[var(--ink-faint)]"><Loader2 className="h-5 w-5 animate-spin" /> Loading shared questions…</div>
          ) : receivedQs.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-[var(--ink-faint)]" />
              <p className="font-display text-xl font-bold text-[var(--ink-soft)]">No shared questions yet</p>
              <p className="mt-1 text-[13.5px] text-[var(--ink-faint)]">When another student shares a question with you, it will appear here and expire after 3 days.</p>
            </GlassCard>
          ) : (
            <div className="grid gap-3">
              {receivedQs.map((row) => {
                const expiresIn = Math.max(0, Math.floor((new Date(row.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)));
                const hours = expiresIn;
                return (
                  <GlassCard key={row.id} hover={false} className="p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("badge", domainColor(row.domain))}>{row.domain}</span>
                          <span className={cn("badge", skillColor(row.skill))}>{row.skill}</span>
                          <span className={cn("badge border", difficultyColor(row.difficulty))}>{row.difficulty}</span>
                          <span className="badge bg-[var(--paper-soft)]">
                            <Clock className="h-3 w-3" /> {hours}h left
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[14px] text-[var(--ink-soft)]">{stripHtml(row.question_html || row.question_text).slice(0, 200)}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--ink-faint)]">
                          <UserRound className="h-3.5 w-3.5" /> Sent by {row.fromDisplayName || row.fromEmail || row.fromId.slice(0, 8)} · {formatDetroitDateTime(row.createdAt)}
                        </p>
                      </div>
                      <div className="ml-auto flex gap-1.5">
                        <button type="button" className="btn btn-primary !min-h-8 !px-3 !text-[12px]" onClick={() => openQuestionQuiz(row.questionId, stripHtml(row.question_html || row.question_text).slice(0, 40))}>
                          <Play className="h-3.5 w-3.5" /> Open
                        </button>
                        <button type="button" className="btn btn-ghost !min-h-8 !px-2.5" onClick={() => void deleteSharedQ(row.id)} title="Dismiss">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}

          {sentQs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[12px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Sent by you</h2>
              <div className="grid gap-2">
                {sentQs.map((row) => (
                  <div key={row.id} className="flex items-center gap-2 rounded-[6px] border border-[var(--line-soft)] bg-[var(--paper-soft)] px-3 py-2 text-[12px] text-[var(--ink-faint)]">
                    <span className="font-mono">{(row as any).questionId?.slice(0, 8)}</span>
                    <span>→</span>
                    <span>{(row as any).toDisplayName || (row as any).toEmail || (row as any).toId}</span>
                    <span className="ml-auto">{formatDetroitDate(row.createdAt)}</span>
                    <button type="button" className="btn btn-ghost !min-h-6 !px-2" onClick={() => void deleteSharedQ(row.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "collections" && (
        <div className="space-y-5">
          {cLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[var(--ink-faint)]"><Loader2 className="h-5 w-5 animate-spin" /> Loading shared collections…</div>
          ) : receivedCs.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <FolderOpen className="mx-auto mb-3 h-10 w-10 text-[var(--ink-faint)]" />
              <p className="font-display text-xl font-bold text-[var(--ink-soft)]">No shared collections yet</p>
              <p className="mt-1 text-[13.5px] text-[var(--ink-faint)]">When someone shares a collection, you&apos;ll see it here with their name attached.</p>
            </GlassCard>
          ) : (
            <div className="grid gap-3">
              {receivedCs.map((row) => (
                <GlassCard key={row.id} hover={false} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 grow">
                      <div className="truncate text-[16px] font-bold text-[var(--ink)]">{row.name}</div>
                      <div className="text-[12.5px] text-[var(--ink-faint)]">
                        {row.questionCount} question{row.questionCount === 1 ? "" : "s"} · Shared by {row.fromDisplayName || row.fromEmail || row.fromId.slice(0, 8)} · {formatDetroitDateTime(row.createdAt)}
                      </div>
                      {row.description && <div className="mt-1 text-[13px] text-[var(--ink-soft)]">{row.description}</div>}
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" className="btn btn-primary !min-h-8 !px-3 !text-[12px]" onClick={() => void openCollectionQuiz(row.collectionId, row.name, (row as any).questionIds)}>
                        <Play className="h-3.5 w-3.5" /> Practice
                      </button>
                      <button type="button" className="btn btn-ghost !min-h-8 !px-2.5" onClick={() => void deleteSharedC(row.id)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {sentCs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[12px] font-bold uppercase tracking-wide text-[var(--ink-faint)]">Collections you shared</h2>
              <div className="grid gap-2">
                {sentCs.map((row) => (
                  <div key={row.id} className="flex items-center gap-2 rounded-[6px] border border-[var(--line-soft)] bg-[var(--paper-soft)] px-3 py-2 text-[12px] text-[var(--ink-faint)]">
                    <span className="font-semibold text-[var(--ink)]">{(row as any).name}</span>
                    <span>→</span>
                    <span>{(row as any).toDisplayName || (row as any).toEmail || (row as any).toId}</span>
                    <span className="ml-auto">{formatDetroitDate(row.createdAt)}</span>
                    <button type="button" className="btn btn-ghost !min-h-6 !px-2" onClick={() => void deleteSharedC(row.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SharedPage() {
  return (
    <RequireAccount feature="shared questions">
      <SharedPageInner />
    </RequireAccount>
  );
}
