"use client";

import * as React from "react";
import { CheckCircle2, Loader2, LogIn, PartyPopper, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { useAuth } from "@/components/auth-provider";
import Stepper, { Step } from "@/components/react-bits/Stepper";

export function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const auth = useAuth();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [signupStep, setSignupStep] = React.useState(1);
  const [success, setSuccess] = React.useState<"signin" | "signup" | null>(null);
  const [prevOpen, setPrevOpen] = React.useState(open);

  // Always land on the sign-in view when the dialog opens.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setMode("signin");
      setSuccess(null);
      setSignupStep(1);
    }
  }

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a password (6+ characters).");
      return;
    }
    if (mode === "signup" && (username.trim().length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username.trim()))) {
      toast.error("Choose a username with 3+ letters/numbers. You can use _, ., or - too.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") await auth.signIn(email.trim(), password);
      else await auth.signUp(email.trim(), password, username.trim());
      setSuccess(mode);
      setPassword("");
      // Give the user a beat of confirmation before the dialog closes itself.
      window.setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
        setSignupStep(1);
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
      {mode === "signup" ? (
        <div className="mt-4">
          <Stepper
            initialStep={1}
            onStepChange={setSignupStep}
            onFinalStepCompleted={() => void submit()}
            nextButtonText="Next"
            backButtonText="Back"
            nextButtonProps={{
              disabled:
                !auth.authEnabled ||
                busy ||
                (signupStep === 1 && (username.trim().length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username.trim()))) ||
                (signupStep === 2 && ((username.trim().length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username.trim())) || !email.trim())) ||
                (signupStep === 3 && ((username.trim().length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username.trim())) || !email.trim() || password.length < 6)),
            }}
          >
            <Step>
              <div className="space-y-3 rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] p-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-[var(--ink)]">Step 1: choose a username</h3>
                  <p className="mt-1 text-[12.5px] text-[var(--ink-faint)]">This is what shows instead of your email prefix.</p>
                </div>
                <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Username</label>
                <input className="input w-full" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!auth.authEnabled || busy} placeholder="zubaidimuhammad13" />
              </div>
            </Step>
            <Step>
              <div className="space-y-3 rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] p-4">
                <h3 className="font-display text-xl font-bold text-[var(--ink)]">Step 2: add your email</h3>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Username</label>
                  <input className="input w-full" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!auth.authEnabled || busy} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Email</label>
                  <input className="input w-full" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!auth.authEnabled || busy} />
                </div>
              </div>
            </Step>
            <Step>
              <div className="space-y-3 rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] p-4">
                <h3 className="font-display text-xl font-bold text-[var(--ink)]">Step 3: create your password</h3>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Username</label>
                  <input className="input w-full" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!auth.authEnabled || busy} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Email</label>
                  <input className="input w-full" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!auth.authEnabled || busy} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Password</label>
                  <input className="input w-full" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!auth.authEnabled || busy} />
                  <p className="mt-1 text-[11.5px] text-[var(--ink-faint)]">Use at least 6 characters.</p>
                </div>
              </div>
            </Step>
          </Stepper>
          {busy && <p className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--accent)]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating account…</p>}
        </div>
      ) : (
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              disabled={!auth.authEnabled || busy}
            />
          </div>
        </div>
      )}

      {mode !== "signup" && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button className="btn btn-primary grow" onClick={() => void submit()} disabled={!auth.authEnabled || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </button>
          <button
            type="button"
            className="btn btn-soft"
            disabled={busy}
            onClick={() => {
              setSignupStep(1);
              setMode("signup");
            }}
          >
            <UserPlus className="h-4 w-4" /> Need an account? Sign up
          </button>
        </div>
      )}

      <div className="mt-4 border-t border-[var(--line-soft)] pt-4">
        {mode === "signup" && (
          <button
            type="button"
            className="btn btn-soft mb-2 w-full"
            disabled={busy}
            onClick={() => {
              setSignupStep(1);
              setMode("signin");
            }}
          >
            Have an account? Sign in
          </button>
        )}
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
