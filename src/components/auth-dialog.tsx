"use client";

import * as React from "react";
import { CheckCircle2, Loader2, LogIn, PartyPopper, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { useAuth } from "@/components/auth-provider";

export function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const auth = useAuth();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState<"signin" | "signup" | null>(null);
  const [prevOpen, setPrevOpen] = React.useState(open);

  // Always land on the sign-in view when the dialog opens.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setMode("signin");
      setSuccess(null);
    }
  }

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a password (6+ characters).");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") await auth.signIn(email.trim(), password);
      else await auth.signUp(email.trim(), password);
      setSuccess(mode);
      setPassword("");
      // Give the user a beat of confirmation before the dialog closes itself.
      window.setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 1600);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      if (mode === "signup" && message?.startsWith("Account created,")) {
        toast.message("Check your email to finish sign-up", { description: message });
      } else {
        toast.error(mode === "signin" ? "Could not sign in" : "Could not sign up", {
          description: message,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <PaperDialog open={open} onOpenChange={onOpenChange} title="">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          {success === "signup" ? (
            <PartyPopper className="h-10 w-10 text-[var(--accent)]" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-[var(--good)]" />
          )}
          <p className="font-display text-2xl font-bold text-[var(--ink)]">
            {success === "signup" ? "Welcome to SAT Nexus!" : "Welcome back!"}
          </p>
          <p className="max-w-xs text-[13.5px] text-[var(--ink-faint)]">
            {success === "signup"
              ? "Your account is ready. Your progress now syncs to the cloud."
              : "You're signed in. Your progress and collections are synced."}
          </p>
        </div>
      </PaperDialog>
    );
  }

  return (
    <PaperDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "signin" ? "Sign in" : "Sign up"}
      description={
        auth.authEnabled
          ? mode === "signin"
            ? "Welcome back — your progress syncs across devices."
            : "Create a free account to sync progress, favorites, and analytics."
          : "Supabase Auth is not configured yet. You can keep practicing as a local guest."
      }
    >
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            Email
          </label>
          <input
            className="input w-full"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!auth.authEnabled || busy}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            Password
          </label>
          <input
            className="input w-full"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            disabled={!auth.authEnabled || busy}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button className="btn btn-primary grow" onClick={() => void submit()} disabled={!auth.authEnabled || busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "signin" ? (
            <LogIn className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        <button
          type="button"
          className="btn btn-soft"
          disabled={busy}
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>

      <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
        <button
          type="button"
          className="btn btn-ghost w-full"
          disabled={busy}
          onClick={() => {
            auth.continueAsLocalGuest();
            onOpenChange(false);
            toast.message("Continuing as guest", {
              description: "Progress stays on this browser until you sign in.",
            });
          }}
        >
          Continue as guest
        </button>
      </div>
    </PaperDialog>
  );
}
