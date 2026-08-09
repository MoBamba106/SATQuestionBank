"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Swords, Trophy, CheckCircle2, XCircle, ArrowLeft, Calculator } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { SafeHtml } from "@/components/ui/safe-html";
import { useAuth } from "@/components/auth-provider";
import { apiGet, apiPatch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SATQuestion } from "@/lib/types";
import { FloatingDesmos } from "@/components/quiz/floating-desmos";
import { AddToCollectionButton } from "@/components/add-to-collection";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { DUEL_HEARTBEAT_MS } from "@/lib/duels";

type DuelDetail = {
  id: string;
  status: string;
  label: string;
  hostUserId: string;
  guestUserId: string | null;
  hostName: string;
  guestName: string;
  hostScore: number;
  guestScore: number;
  currentIndex: number;
  questionCount: number;
  answers: Record<string, { userId: string; answer: string; correct: boolean; at: string }>;
  winnerUserId?: string | null;
  questions: SATQuestion[];
  you: "host" | "guest" | null;
};

export default function DuelRoomPage() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const router = useRouter();
  const [duel, setDuel] = React.useState<DuelDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [selected, setSelected] = React.useState("");
  const [desmosOpen, setDesmosOpen] = React.useState(false);
  const [desmosRestoreRequest, setDesmosRestoreRequest] = React.useState(0);

  const load = React.useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiGet<DuelDetail>(`/api/duels/${id}`);
      setDuel(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load duel");
    }
  }, [id]);

  React.useEffect(() => {
    void load();
    const supabase = getSupabaseBrowserClient();
    const roomChannelName = `duel_room_${id}`;

    if (!supabase) {
      const t = window.setInterval(() => void load(), 2000);
      return () => window.clearInterval(t);
    }

    const channel = supabase
      .channel(roomChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "duels", filter: `id=eq.${id}` },
        () => void load(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Broadcast player joined for this room
          void channel.send({
            type: "broadcast",
            event: "PLAYER_JOINED",
            payload: { userId: auth.user.id, at: new Date().toISOString() },
          });
        }
      });

    // Listen to direct broadcast events from other clients
    channel
      .on("broadcast", { event: "PLAYER_JOINED" }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== auth.user.id) {
          toast.success("Opponent joined the lobby!");
          void load();
        }
      })
      .on("broadcast", { event: "ANSWER_SUBMITTED" }, (payload) => {
        if (payload.payload?.questionId && payload.payload?.userId !== auth.user.id) {
          void load();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, load, auth.user.id]);

  React.useEffect(() => {
    setSelected("");
  }, [duel?.currentIndex, duel?.id]);

  // Room heartbeat: keep the duel alive while this player is actually in the
  // room. Sends a WebSocket broadcast (visible to the opponent's client) plus
  // a server-recorded heartbeat so abandoned rooms auto-expire after 90s of
  // total silence (see lib/duels.ts and the duels API routes).
  React.useEffect(() => {
    if (!id) return;
    // Once the duel reaches a terminal state, stop beating.
    const status = duel?.status;
    if (status && status !== "active" && status !== "pending") return;

    const send = async () => {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        void supabase.channel(`duel_room_${id}`).send({
          type: "broadcast",
          event: "HEARTBEAT",
          payload: { userId: auth.user.id, at: new Date().toISOString() },
        });
      }
      try {
        await apiPatch(`/api/duels/${id}`, { action: "heartbeat" });
      } catch {
        // Room may be gone / expired — the realtime + poll loop surfaces it.
      }
    };

    void send();
    const timer = window.setInterval(() => void send(), DUEL_HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [id, auth.user.id, duel?.status]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-display text-2xl font-bold text-[var(--ink)]">{error}</p>
        <Link href="/duel" className="btn btn-soft mt-4 inline-flex">
          <ArrowLeft className="h-4 w-4" /> Back to duels
        </Link>
      </div>
    );
  }

  if (!duel) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[var(--ink-faint)]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading duel…
      </div>
    );
  }

  const youAreHost = duel.you === "host";
  const yourName = youAreHost ? duel.hostName : duel.guestName;
  const oppName = youAreHost ? duel.guestName : duel.hostName;
  const yourScore = youAreHost ? duel.hostScore : duel.guestScore;
  const oppScore = youAreHost ? duel.guestScore : duel.hostScore;
  const total = Math.max(1, duel.questionCount);
  const yourPct = Math.round((yourScore / total) * 100);
  const oppPct = Math.round((oppScore / total) * 100);

  if (duel.status === "pending") {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <Swords className="mx-auto h-10 w-10 text-[var(--accent)]" />
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Waiting for opponent</h1>
        <p className="text-[14px] text-[var(--ink-faint)]">
          {youAreHost
            ? `${duel.guestName} hasn’t accepted yet. This page updates automatically.`
            : `${duel.hostName} challenged you — accept from the Duels lobby.`}
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/duel" className="btn btn-soft">
            <ArrowLeft className="h-4 w-4" /> Lobby
          </Link>
          {!youAreHost && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await apiPatch(`/api/duels/${duel.id}`, { action: "accept" });
                  await load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Accept duel
            </button>
          )}
        </div>
      </div>
    );
  }

  if (duel.status === "completed" || duel.status === "declined" || duel.status === "cancelled" || duel.status === "expired") {
    const won = duel.winnerUserId === auth.user.id;
    const draw = !duel.winnerUserId && duel.status === "completed";
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <Trophy className={cn("mx-auto h-12 w-12", won ? "text-[#d7a13c]" : "text-[var(--ink-faint)]")} />
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
          {duel.status !== "completed"
            ? duel.status.charAt(0).toUpperCase() + duel.status.slice(1)
            : won
              ? "You win!"
              : draw
                ? "Draw"
                : "Defeat"}
        </h1>
        <p className="font-mono text-2xl font-bold text-[var(--ink)]">
          {yourScore} – {oppScore}
        </p>
        <p className="text-[13px] text-[var(--ink-faint)]">
          {yourName} vs {oppName}
        </p>
        <div className="flex justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => router.push("/duel")}>
            New duel
          </button>
          <Link href="/leaderboard" className="btn btn-soft">
            Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  const q = duel.questions[duel.currentIndex];
  const lock = q ? duel.answers[q.id] : undefined;
  const lockedOut = Boolean(lock);

  const submit = async (answer: string) => {
    if (!q || lockedOut || busy) return;
    setBusy(true);
    setSelected(answer);
    try {
      // Broadcast answer event immediately for live UI updates
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const roomChannelName = `duel_room_${duel.id}`;
        void supabase?.channel(roomChannelName).send({
          type: "broadcast",
          event: "ANSWER_SUBMITTED",
          payload: {
            userId: auth.user.id,
            questionId: q.id,
            answer,
            at: new Date().toISOString(),
          },
        });
      }
      const res = await apiPatch<{
        correct?: boolean;
        hostScore: number;
        guestScore: number;
        status: string;
      }>(`/api/duels/${duel.id}`, { action: "answer", questionId: q.id, answer });
      if (res.correct) toast.success("Point!");
      else toast.message("Locked in — incorrect");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't lock answer");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Scoreboard */}
      <GlassCard hover={false} className="overflow-hidden p-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-[var(--paper-soft)] px-4 py-3 sm:px-6">
          <div className="min-w-0 text-left">
            <div className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">You</div>
            <div className="truncate text-[15px] font-bold text-[var(--ink)]">{yourName}</div>
            <div className="font-mono text-2xl font-bold text-[var(--accent)]">{yourScore}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Swords className="h-5 w-5 text-[var(--ink-faint)]" />
            <span className="text-[11px] font-bold uppercase text-[var(--ink-faint)]">
              Q {Math.min(duel.currentIndex + 1, total)}/{total}
            </span>
          </div>
          <div className="min-w-0 text-right">
            <div className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Opponent</div>
            <div className="truncate text-[15px] font-bold text-[var(--ink)]">{oppName}</div>
            <div className="font-mono text-2xl font-bold text-[var(--ink)]">{oppScore}</div>
          </div>
        </div>
        <div className="flex h-2.5 overflow-hidden bg-[var(--paper-deep)]">
          <div className="h-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${yourPct}%` }} />
          <div className="h-full grow" />
          <div className="h-full bg-[var(--ink-faint)]/50 transition-[width] duration-300" style={{ width: `${oppPct}%` }} />
        </div>
      </GlassCard>

      {q ? (
        <GlassCard hover={false} className="space-y-4 p-5 sm:p-7">
          <div className="flex items-center justify-between mb-4 border-b border-[var(--line-soft)] pb-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                {q.domain} · {q.skill}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {q.domain === "Math" && (
                <button
                  type="button"
                  className="btn btn-soft !min-h-8 !px-2.5 !py-1.5 !text-[12px]"
                  onClick={() => {
                    setDesmosOpen(true);
                    setDesmosRestoreRequest((n) => n + 1);
                  }}
                >
                  <Calculator className="h-3.5 w-3.5" /> Desmos
                </button>
              )}
              <AddToCollectionButton questionId={q.id} />
            </div>
          </div>

          {q.passageHtml && (
            <div className="glass-subtle max-h-[280px] overflow-y-auto p-4 scrollbar-thin">
              <SafeHtml html={q.passageHtml} className="sat-content text-[14px] text-[var(--ink-soft)]" />
            </div>
          )}
          <SafeHtml html={q.questionHtml || q.questionText} className="sat-content" />

          {lockedOut && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-[6px] border px-3 py-2 text-[13px] font-semibold",
                lock?.correct ? "border-[#bde5cf] bg-[#ecf8f1] text-[#238a5e]" : "border-[#f3ccd4] bg-[#fdf0f2] text-[#a33046]",
              )}
            >
              {lock?.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {lock?.userId === auth.user.id
                ? lock.correct
                  ? "You locked the correct answer first."
                  : "You locked first — but it was incorrect."
                : `${oppName} locked first (${lock?.correct ? "correct" : "incorrect"}).`}
            </div>
          )}

          {q.type === "multiple_choice" && q.choices ? (
            <div className="space-y-2">
              {q.choices.map((c) => {
                const isSel = selected === c.key || lock?.answer === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    disabled={lockedOut || busy}
                    onClick={() => void submit(c.key)}
                    className={cn(
                      "answer-choice flex w-full items-start gap-3 rounded-[6px] border px-4 py-3 text-left",
                      isSel && "border-[var(--accent)] bg-[var(--accent-soft)]",
                      lockedOut && "cursor-not-allowed opacity-80",
                    )}
                  >
                    <span className="answer-letter mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[12.5px] font-bold">
                      {c.key}
                    </span>
                    <SafeHtml html={c.html || c.text} className="sat-content grow text-[15px]" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex max-w-sm gap-2">
              <input
                className="input grow font-mono"
                value={selected}
                disabled={lockedOut || busy}
                placeholder="Type answer…"
                onChange={(e) => setSelected(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit(selected)}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={lockedOut || busy || !selected.trim()}
                onClick={() => void submit(selected)}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lock"}
              </button>
            </div>
          )}

          {lockedOut && duel.currentIndex < total - 1 && (
            <p className="text-center text-[12.5px] text-[var(--ink-faint)]">
              Waiting for both sides to sync… next question loads automatically.
            </p>
          )}
        </GlassCard>
      ) : (
        <p className="py-10 text-center text-[var(--ink-faint)]">No question loaded.</p>
      )}

      {q && (
        <FloatingDesmos
          open={desmosOpen && q.domain === "Math"}
          restoreRequest={desmosRestoreRequest}
          onClose={() => setDesmosOpen(false)}
        />
      )}
    </div>
  );
}
