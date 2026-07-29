"use client";

import * as React from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { useAuth } from "@/components/auth-provider";

export function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const auth = useAuth();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a password (6+ characters).");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") await auth.signIn(email.trim(), password);
      else await auth.signUp(email.trim(), password);
      toast.success(mode === "signin" ? "Signed in" : "Account created");
      onOpenChange(false);
    } catch (error) {
      toast.error(mode === "signin" ? "Could not sign in" : "Could not create account", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PaperDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "signin" ? "Sign in" : "Create account"}
      description={
        auth.cloudBaseEnabled
          ? "Your progress syncs across devices via CloudBase."
          : "CloudBase is not configured yet. You can keep practicing as a local guest."
      }
    >
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Email</label>
          <input
            className="input w-full"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!auth.cloudBaseEnabled || busy}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">Password</label>
          <input
            className="input w-full"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            disabled={!auth.cloudBaseEnabled || busy}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <button className="btn btn-primary grow" onClick={() => void submit()} disabled={!auth.cloudBaseEnabled || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          className="btn btn-soft"
          disabled={busy}
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "Need an account?" : "Have an account?"}
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
            toast.message("Continuing as guest", { description: "Progress stays on this browser until you sign in." });
          }}
        >
          Continue as guest
        </button>
      </div>
    </PaperDialog>
  );
}
