"use client";

import * as React from "react";
import { CheckCircle2, Loader2, LogIn, PartyPopper, UserPlus, KeyRound, ArrowLeft, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { useAuth } from "@/components/auth-provider";
import { requestPasswordReset } from "@/lib/auth/client";
import Stepper, { Step } from "@/components/react-bits/Stepper";

export function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const auth = useAuth();
  const [mode, setMode] = React.useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [signupStep, setSignupStep] = React.useState(1);
  const [success, setSuccess] = React.useState<"signin" | "signup" | "forgot" | null>(null);
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

  const submitPasskey = async () => {
    setBusy(true);
    try {
      await auth.signInPasskey(email.trim() || undefined);
      setSuccess("signin");
      window.setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 1600);
    } catch (error) {
      toast.error("Passkey sign-in failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Enter the email address for your account.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSuccess("forgot");
    } catch (error) {
      toast.error("Could not send reset email", {
        description: error instanceof Error ? error.message : undefined,
      });
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
            {success === "signup"
              ? "Welcome to SAT Nexus!"
              : success === "forgot"
                ? "Check your inbox"
                : "Welcome back!"}
          </p>
          <p className="max-w-xs text-[13.5px] text-[var(--ink-faint)]">
            {success === "signup"
              ? "Your account is ready. Your progress now syncs to the cloud."
              : success === "forgot"
                ? "If an account exists for that email, we sent a secure link to reset your password. It may take a minute to arrive."
                : "You're signed in. Your progress and collections are synced."}
          </p>
          {success === "forgot" && (
            <button
              type="button"
              className="btn btn-soft mt-2"
              onClick={() => {
                setSuccess(null);
                setMode("signin");
              }}
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </button>
          )}
        </div>
      </PaperDialog>
    );
  }

  const title =
    mode === "signin" ? "Sign in" : mode === "signup" ? "Sign up" : "Forgot password";
  const description = !auth.authEnabled
    ? "Supabase Auth is not configured yet. You can keep practicing as a local guest."
    : mode === "signin"
      ? "Welcome back — your progress syncs across devices."
      : mode === "signup"
        ? "Create a free account to sync progress, favorites, and analytics."
        : "Enter your account email and we’ll send a secure reset link.";

  return (
    <PaperDialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
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
                <input className="input w-full" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!auth.authEnabled || busy} placeholder="student_name" />
              </div>
            </Step>
            <Step>
              <div className="space-y-3 rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] p-4">
                <h3 className="font-display text-xl font-bold text-[var(--ink)]">Step 2: add your email</h3>
                <p className="text-[12.5px] text-[var(--ink-faint)]">We&apos;ll use this to sync your progress and help you sign in.</p>
                <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Email</label>
                <input className="input w-full" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!auth.authEnabled || busy} placeholder="you@example.com" />
              </div>
            </Step>
            <Step>
              <div className="space-y-3 rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] p-4">
                <h3 className="font-display text-xl font-bold text-[var(--ink)]">Step 3: create your password</h3>
                <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Password</label>
                <input className="input w-full" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!auth.authEnabled || busy} />
                <p className="mt-1 text-[11.5px] text-[var(--ink-faint)]">Use at least 6 characters.</p>
              </div>
            </Step>
          </Stepper>
          {busy && <p className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--accent)]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating account…</p>}
        </div>
      ) : mode === "forgot" ? (
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
              onKeyDown={(e) => e.key === "Enter" && void submitForgot()}
              disabled={!auth.authEnabled || busy}
              placeholder="you@example.com"
            />
          </div>
          <button className="btn btn-primary w-full" onClick={() => void submitForgot()} disabled={!auth.authEnabled || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Send reset link
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full"
            disabled={busy}
            onClick={() => setMode("signin")}
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </button>
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
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                className="text-[12px] font-semibold text-[var(--accent)] hover:underline disabled:opacity-50"
                disabled={!auth.authEnabled || busy}
                onClick={() => setMode("forgot")}
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "signin" && (
        <div className="mt-5 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2.5">
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
          <button
            type="button"
            className="btn btn-soft w-full"
            disabled={!auth.authEnabled || busy}
            onClick={() => void submitPasskey()}
            title="Use Face ID, Touch ID, or Windows Hello"
          >
            <Fingerprint className="h-4 w-4" />
            Sign in with passkey
          </button>
          <p className="text-center text-[11px] text-[var(--ink-faint)]">
            Passkeys use WebAuthn (Face ID / Touch ID / Windows Hello). Enable them in Supabase → Authentication → Providers.
          </p>
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
