"use client";

import * as React from "react";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { AuthDialog } from "@/components/auth-dialog";
import { useAuth } from "@/components/auth-provider";
import { PageSkeleton } from "@/components/ui/page-skeleton";

/**
 * Wraps account-only pages (collections, analytics, leaderboard, …).
 * Guests see a friendly lock screen prompting them to sign in or sign up.
 */
export function RequireAccount({
  feature,
  children,
}: {
  feature: string;
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const [authOpen, setAuthOpen] = React.useState(false);

  if (!auth.ready) return <PageSkeleton cards={4} />;

  if (auth.user.isGuest) {
    return (
      <>
        <GlassCard hover={false} className="mx-auto max-w-lg p-10 text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-[var(--accent)]" />
          <p className="font-display text-2xl font-bold text-[var(--ink)]">Sign in to use {feature}</p>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--ink-faint)]">
            {feature.charAt(0).toUpperCase() + feature.slice(1)} stores your data in your account so it syncs across devices.
            Sign in to continue — or sign up free if you don&apos;t have an account yet.
          </p>
          <div className="mt-5 flex justify-center gap-2.5">
            <button type="button" className="btn btn-primary" onClick={() => setAuthOpen(true)}>
              <LogIn className="h-4 w-4" /> Sign in
            </button>
            <button type="button" className="btn btn-soft" onClick={() => setAuthOpen(true)}>
              <UserPlus className="h-4 w-4" /> Sign up
            </button>
          </div>
        </GlassCard>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  return <>{children}</>;
}
