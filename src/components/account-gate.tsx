"use client";

import * as React from "react";
import { LogIn, Lock, UserPlus } from "lucide-react";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { useAuth } from "@/components/auth-provider";
import { AuthDialog } from "@/components/auth-dialog";

type AccountGateContextValue = {
  /**
   * Returns true when the user has a real account.
   * Otherwise opens a friendly "sign in required" dialog and returns false.
   */
  requireAccount: (featureLabel: string) => boolean;
};

const AccountGateContext = React.createContext<AccountGateContextValue | null>(null);

export function AccountGateProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [feature, setFeature] = React.useState<string | null>(null);
  const [authOpen, setAuthOpen] = React.useState(false);

  const requireAccount = React.useCallback(
    (featureLabel: string) => {
      if (!auth.user.isGuest) return true;
      setFeature(featureLabel);
      return false;
    },
    [auth.user.isGuest],
  );

  const value = React.useMemo(() => ({ requireAccount }), [requireAccount]);

  return (
    <AccountGateContext.Provider value={value}>
      {children}
      <PaperDialog
        open={feature != null}
        onOpenChange={(open) => !open && setFeature(null)}
        title={
          <span className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[var(--accent)]" /> Account needed
          </span>
        }
        description={`${feature ?? "This feature"} saves your data to your account, so you need to be signed in to use it.`}
      >
        <p className="mt-3 rounded-[6px] bg-[var(--paper-soft)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink-soft)]">
          Sign in to keep favorites, collections, analytics, leaderboards, and practice-test progress synced across devices.
          Don&apos;t have an account yet? Signing up is free and takes under a minute.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button
            type="button"
            className="btn btn-primary grow"
            onClick={() => {
              setFeature(null);
              setAuthOpen(true);
            }}
          >
            <LogIn className="h-4 w-4" /> Sign in
          </button>
          <button
            type="button"
            className="btn btn-soft grow"
            onClick={() => {
              setFeature(null);
              setAuthOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" /> Sign up
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setFeature(null)}>
            Not now
          </button>
        </div>
      </PaperDialog>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </AccountGateContext.Provider>
  );
}

export function useAccountGate() {
  const ctx = React.useContext(AccountGateContext);
  if (!ctx) throw new Error("useAccountGate must be used inside AccountGateProvider");
  return ctx;
}
