"use client";
import { formatDetroitDate, formatDetroitDateTime } from "@/lib/utils";

import * as React from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useApi, apiPatch, apiDeleteJson, mutateKey, setImpersonatedUser, getImpersonatedUser } from "@/lib/api-client";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  hideLeaderboard: boolean;
  createdAt: string;
  attempts: number;
  correct: number;
  sessions: number;
  lastActive: string | null;
  lastSeen: string | null;
  isOnline: boolean;
};

type Overview = {
  users: AdminUser[];
  totals: { users: number; attempts: number; correct: number; sessions: number };
  byDomain: { domain: string; total: number; correct: number }[];
  activity: { date: string; attempts: number; correct: number }[];
  feedbackCounts: { status: string; c: number }[];
};

type FeedbackItem = {
  id: number;
  email: string | null;
  displayName: string | null;
  category: string;
  title: string;
  message: string;
  status: string;
  githubIssueUrl: string | null;
  context: string | null;
  createdAt: string;
};

function StatTile({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <GlassCard hover={false} className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] bg-[var(--accent-soft)]">
        <Icon className="h-5 w-5 text-[var(--accent)]" />
      </div>
      <div>
        <div className="font-mono text-[20px] font-bold leading-none text-[var(--ink)]">{value}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{label}</div>
      </div>
    </GlassCard>
  );
}

export default function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = React.useState<"overview" | "feedback">("overview");
  const { data, loading, error, reload } = useApi<Overview>(
    auth.isAdmin ? "/api/admin/overview" : null,
    "admin-overview",
  );
  const { data: fbData, reload: reloadFb } = useApi<{ feedback: FeedbackItem[] }>(
    auth.isAdmin && tab === "feedback" ? "/api/feedback" : null,
    "admin-feedback",
  );
  const [updating, setUpdating] = React.useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUser | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const impersonating = getImpersonatedUser();

  if (!auth.ready) return <PageSkeleton cards={4} />;

  if (!auth.isAdmin) {
    return (
      <GlassCard hover={false} className="mx-auto max-w-lg p-10 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-[var(--ink-faint)]" />
        <p className="font-display text-xl font-bold text-[var(--ink-soft)]">Admins only</p>
        <p className="mt-1 text-[13.5px] text-[var(--ink-faint)]">
          Sign in with an admin account to open this console. Admin emails are configured with the
          <code className="mx-1 rounded bg-[var(--paper-soft)] px-1.5 py-0.5 font-mono text-[11.5px]">ADMIN_EMAILS</code>
          environment variable.
        </p>
      </GlassCard>
    );
  }

  const impersonate = (user: AdminUser) => {
    const label = user.displayName || user.email || user.id.slice(0, 8);
    setImpersonatedUser({ id: user.id, label });
    mutateKey("stats");
    mutateKey("favorites");
    mutateKey("collections");
    mutateKey("mistakes");
    toast.success(`Now viewing as ${label}`, { description: "All pages show their data. Use the banner to exit." });
  };

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDeleteJson(`/api/admin/users/${encodeURIComponent(deleteTarget.id)}`, { confirm: "DELETE" });
      if (impersonating?.id === deleteTarget.id) setImpersonatedUser(null);
      toast.success("Account deleted", { description: deleteTarget.email || deleteTarget.displayName || deleteTarget.id });
      setDeleteTarget(null);
      await reload();
      mutateKey("admin-overview");
    } catch (error) {
      toast.error("Couldn't delete account", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const setStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      await apiPatch("/api/feedback", { id, status });
      await reloadFb();
    } catch (error) {
      toast.error("Couldn't update status", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setUpdating(null);
    }
  };

  const deleteFeedback = async (id: number) => {
    setUpdating(id);
    try {
      await apiDeleteJson("/api/feedback", { id });
      toast.success("Feedback deleted");
      await reloadFb();
    } catch (error) {
      toast.error("Couldn't delete feedback", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setUpdating(null);
    }
  };

  const downloadFeedback = () => {
    if (!fbData || fbData.feedback.length === 0) return;
    const lines: string[] = [];
    fbData.feedback.forEach((item, index) => {
      lines.push(`Subject: ${item.title}`);
      lines.push(`Description: ${item.message}`);
      if (item.context) lines.push(`Context: ${item.context}`);
      if (item.email || item.displayName) lines.push(`From: ${item.displayName || "anonymous"}${item.email ? ` <${item.email}>` : ""}`);
      lines.push(`Status: ${item.status}`);
      if (index < fbData.feedback.length - 1) lines.push("", "---", "");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${fbData.feedback.length} request${fbData.feedback.length === 1 ? "" : "s"}`);
  };

  const accuracy = data && data.totals.attempts > 0 ? Math.round((data.totals.correct / data.totals.attempts) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Admin console</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Site administration</h1>
          <p className="mt-1 text-[14px] text-[var(--ink-faint)]">
            Accounts, combined analytics, feedback review, and account impersonation.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={tab === "overview" ? "btn btn-primary" : "btn btn-soft"} onClick={() => setTab("overview")}>
            <BarChart3 className="h-4 w-4" /> Overview
          </button>
          <button type="button" className={tab === "feedback" ? "btn btn-primary" : "btn btn-soft"} onClick={() => setTab("feedback")}>
            <MessageSquareText className="h-4 w-4" /> Feedback
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[6px] border border-[#e9c6cc] bg-[#fff7f7] px-4 py-3 text-[13.5px] font-semibold text-[#ae3d51]">
          {error}
        </div>
      )}

      {tab === "overview" && (
        <>
          {loading && !data ? (
            <PageSkeleton cards={6} />
          ) : data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Accounts" value={data.totals.users.toLocaleString()} icon={Users} />
                <StatTile label="Total attempts" value={data.totals.attempts.toLocaleString()} icon={Activity} />
                <StatTile label="Combined accuracy" value={`${accuracy}%`} icon={CheckCircle2} />
                <StatTile label="Finished sessions" value={data.totals.sessions.toLocaleString()} icon={BarChart3} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <GlassCard hover={false} className="p-5">
                  <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Attempts by section (all users)</h2>
                  {data.byDomain.length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-[var(--ink-faint)]">No attempts recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.byDomain.map((row) => {
                        const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
                        return (
                          <div key={row.domain}>
                            <div className="mb-1 flex justify-between text-[12.5px] font-semibold text-[var(--ink-soft)]">
                              <span>{row.domain}</span>
                              <span>{row.correct.toLocaleString()}/{row.total.toLocaleString()} · {pct}%</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--paper-deep)]">
                              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>

                <GlassCard hover={false} className="p-5">
                  <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Last 30 days of activity</h2>
                  {data.activity.length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-[var(--ink-faint)]">No recent activity.</p>
                  ) : (
                    <div className="flex h-32 items-end gap-[3px]">
                      {data.activity.map((day) => {
                        const max = Math.max(...data.activity.map((d) => d.attempts), 1);
                        return (
                          <div
                            key={day.date}
                            title={`${day.date}: ${day.attempts} attempts (${day.correct} correct)`}
                            className="grow rounded-t bg-[var(--accent)] opacity-80 transition-opacity hover:opacity-100"
                            style={{ height: `${Math.max(6, (day.attempts / max) * 100)}%` }}
                          />
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              </div>

              <GlassCard hover={false} className="p-0">
                <div className="border-b border-[var(--line-soft)] p-4">
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                    Accounts ({data.users.length}) · green = online (last 2 min)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--line-soft)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
                        <th className="px-4 py-2.5">User</th>
                        <th className="px-4 py-2.5">Attempts</th>
                        <th className="px-4 py-2.5">Accuracy</th>
                        <th className="px-4 py-2.5">Sessions</th>
                        <th className="px-4 py-2.5">Presence</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((user) => {
                        const acc = user.attempts > 0 ? Math.round((user.correct / user.attempts) * 100) : 0;
                        const isSelf = user.id === auth.user.id;
                        const isImpersonated = impersonating?.id === user.id;
                        return (
                          <tr key={user.id} className="border-b border-[var(--line-soft)] last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                  {user.isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />}
                                  <span
                                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${user.isOnline ? "bg-green-500" : "bg-[var(--line-soft)]"}`}
                                    title={user.isOnline ? "Online now" : user.lastSeen ? `Last seen ${formatDetroitDateTime(user.lastSeen)}` : "Offline"}
                                  />
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                                    <span className="truncate">{user.displayName || user.email || user.id.slice(0, 10)}</span>
                                    {isSelf && <span className="text-[10px] font-bold uppercase text-[var(--accent)]">You</span>}
                                  </div>
                                  <div className="text-[11px] text-[var(--ink-faint)]">{user.email ?? "no email"}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono">{user.attempts.toLocaleString()}</td>
                            <td className="px-4 py-3 font-mono">{user.attempts > 0 ? `${acc}%` : "—"}</td>
                            <td className="px-4 py-3 font-mono">{user.sessions}</td>
                            <td className="px-4 py-3 text-[12px]">
                              {user.isOnline ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-green-600">● Online now</span>
                              ) : user.lastSeen ? (
                                <span className="text-[var(--ink-faint)]">Seen {formatDetroitDateTime(user.lastSeen)}</span>
                              ) : user.lastActive ? (
                                <span className="text-[var(--ink-faint)]">Active {formatDetroitDate(user.lastActive)}</span>
                              ) : (
                                <span className="text-[var(--ink-faint)]">never</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {!isSelf && (
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  <button
                                    type="button"
                                    className={cn("btn !min-h-8 !px-3 !py-1.5 !text-[11.5px]", isImpersonated ? "btn-danger" : "btn-soft")}
                                    onClick={() => (isImpersonated ? setImpersonatedUser(null) : impersonate(user))}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    {isImpersonated ? "Stop viewing" : "View as"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-danger !min-h-8 !px-3 !py-1.5 !text-[11.5px]"
                                    onClick={() => setDeleteTarget(user)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </>
          ) : null}
        </>
      )}

      {tab === "feedback" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-[var(--ink-faint)]">
              {fbData ? `${fbData.feedback.length} request${fbData.feedback.length === 1 ? "" : "s"}` : "Loading requests…"}
            </p>
            <button
              type="button"
              className="btn btn-soft !min-h-8 !px-3 !py-1.5 !text-[12px]"
              onClick={downloadFeedback}
              disabled={!fbData || fbData.feedback.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> Download all (.txt)
            </button>
          </div>
          {!fbData ? (
            <PageSkeleton cards={3} />
          ) : fbData.feedback.length === 0 ? (
            <GlassCard hover={false} className="p-10 text-center">
              <MessageSquareText className="mx-auto mb-3 h-10 w-10 text-[var(--ink-faint)]" />
              <p className="font-display text-xl font-bold text-[var(--ink-soft)]">No feedback yet</p>
            </GlassCard>
          ) : (
            fbData.feedback.map((item) => (
              <GlassCard key={item.id} hover={false} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "badge",
                    item.category === "complaint" ? "soft-tone-rose" : item.category === "bug" ? "soft-tone-yellow" : "soft-tone-teal",
                  )}>
                    {item.category}
                  </span>
                  <span className="text-[15px] font-bold text-[var(--ink)]">{item.title}</span>
                  <span className="ml-auto text-[11.5px] text-[var(--ink-faint)]">
                    {formatDetroitDateTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{item.message}</p>
                {item.context && (
                  <p className="mt-2 rounded-[5px] border border-[var(--line-soft)] bg-[var(--paper-soft)] px-3 py-2 text-[12px] leading-relaxed text-[var(--ink-soft)]">
                    <span className="font-bold uppercase tracking-wide text-[var(--ink-faint)]">Context: </span>
                    {item.context}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--line-soft)] pt-3">
                  <span className="text-[12px] text-[var(--ink-faint)]">
                    From: {item.displayName || item.email || "anonymous"}
                  </span>
                  {item.githubIssueUrl && (
                    <a
                      href={item.githubIssueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> GitHub issue
                    </a>
                  )}
                  <div className="ml-auto flex gap-1.5">
                    {["new", "reviewed", "done"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={updating === item.id}
                        onClick={() => void setStatus(item.id, status)}
                        className={cn(
                          "btn !min-h-7 !px-2.5 !py-1 !text-[11px] capitalize",
                          item.status === status ? "btn-primary" : "btn-ghost",
                        )}
                      >
                        {updating === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : status}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={updating === item.id}
                      onClick={() => void deleteFeedback(item.id)}
                      title="Delete this feedback once addressed"
                      className="btn !min-h-7 !px-2.5 !py-1 !text-[11px] text-[var(--bad)] hover:!border-[var(--bad)] hover:!bg-[#f9e9ec]"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
          <button type="button" className="btn btn-soft" onClick={() => { void reload(); void reloadFb(); }}>
            Refresh
          </button>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-[10px] border border-[#d2abb7] bg-[var(--paper)] p-5 shadow-[0_18px_45px_rgba(20,24,34,0.24)]">
            <div className="mb-3 flex items-center gap-2 text-[#ae3d51]">
              <Trash2 className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold">Delete this account?</h2>
            </div>
            <p className="text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
              This will delete <strong>{deleteTarget.displayName || deleteTarget.email || deleteTarget.id}</strong> and their practice history, collections, notes, favorites, and sessions. This cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-soft" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => void deleteAccount()} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Yes, delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
