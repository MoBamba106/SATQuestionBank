"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenSquare,
  Library,
  MonitorSmartphone,
  Folders,
  RotateCcw,
  BarChart3,
  CalendarClock,
  Trophy,
  BookOpenText,
  BookMarked,
  MessageSquarePlus,
  Cog,
  ShieldCheck,
  Menu,
  X,
  Search,
  LogIn,
  LogOut,
  UserRound,
  Share2,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "@/components/settings-dialog";
import { FloatingStudyTimer } from "@/components/floating-study-timer";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/command-palette";
import { AuthDialog } from "@/components/auth-dialog";
import { useAuth } from "@/components/auth-provider";
import { useSettings } from "@/components/settings-provider";
import { AccountGateProvider } from "@/components/account-gate";
import { IntroTutorial } from "@/components/intro-tutorial";
import { NavDock } from "@/components/nav-dock";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { apiGet, getImpersonatedUser, setImpersonatedUser, mutateKey } from "@/lib/api-client";
import { PresenceTracker } from "@/components/presence-tracker";
import { Footer } from "@/components/footer";
import { toast } from "sonner";

const BASE_NAV_GROUPS = [
  {
    label: "Study",
    items: [
      { href: "/", label: "Study desk", icon: LayoutDashboard },
      { href: "/study", label: "Study library", icon: BookMarked },
      { href: "/quiz", label: "Practice quiz", icon: PenSquare },
      { href: "/duel", label: "Quiz duels", icon: Swords },
      { href: "/bank", label: "Question bank", icon: Library },
      { href: "/bluebook", label: "Practice tests", icon: MonitorSmartphone },
    ],
  },
  {
    label: "Organize",
    items: [
      { href: "/collections", label: "Collections", icon: Folders },
      { href: "/mistakes", label: "Mistake bank", icon: RotateCcw },
    ],
  },
  {
    label: "Progress",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/study-sessions", label: "Study sessions", icon: CalendarClock },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
];

const COMMUNITY_BASE = [
  { href: "/shared", label: "Shared Questions", icon: Share2 },
  { href: "/feedback", label: "Feedback", icon: MessageSquarePlus },
];

function NavLinks({
  onNavigate,
  compact = false,
  isAdmin = false,
  showGroupLabels = true,
}: {
  onNavigate?: () => void;
  compact?: boolean;
  isAdmin?: boolean;
  showGroupLabels?: boolean;
}) {
  const pathname = usePathname();
  const groups = React.useMemo(() => {
    const communityItems = isAdmin
      ? [
          { href: "/shared", label: "Shared Questions", icon: Share2 },
          { href: "/feedback", label: "Feedback", icon: MessageSquarePlus },
          { href: "/admin", label: "Admin console", icon: ShieldCheck },
        ]
      : COMMUNITY_BASE;
    return [
      ...BASE_NAV_GROUPS,
      {
        label: "Community",
        items: communityItems,
      },
    ];
  }, [isAdmin]);

  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-2">
      {groups.map((group, index) => (
        <React.Fragment key={group.label}>
          {index > 0 && (
            <div className="mx-3 h-[1px] shrink-0 bg-[var(--line-soft)]" aria-hidden="true" />
          )}
          <div className="flex flex-col gap-0.5">
            {showGroupLabels && (
              <div
                className={cn(
                  "px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)] transition-[opacity,height,margin] duration-200 overflow-hidden whitespace-nowrap",
                  compact ? "h-0 opacity-0 mb-0" : "h-[14px] opacity-100 mb-1.5"
                )}
                aria-hidden={compact}
              >
                {group.label}
              </div>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={label}
                  aria-label={compact ? label : undefined}
                  className={cn(
                    "relative flex min-h-10 items-center overflow-hidden whitespace-nowrap border-l-[3px] py-2 text-[13.5px] font-semibold transition-colors",
                    active
                      ? "nav-link-active"
                      : "border-transparent text-[var(--ink-soft)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
                  )}
                >
                  <div className="flex w-[71px] shrink-0 items-center justify-center">
                    <Icon
                      className={cn("nav-item-icon h-[17px] w-[17px]", active ? "text-[var(--accent)]" : "text-[var(--ink-faint)]")}
                      strokeWidth={active ? 2.3 : 2}
                    />
                  </div>
                  <span className={cn("truncate transition-opacity duration-200", compact ? "opacity-0" : "opacity-100")}>{label}</span>
                </Link>
              );
            })}
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
}

export function NavShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [desktopExpanded, setDesktopExpanded] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  const [signOutConfirm, setSignOutConfirm] = React.useState(false);
  const [tutorialForce, setTutorialForce] = React.useState(false);
  const [impersonating, setImpersonating] = React.useState<{ id: string; label: string } | null>(null);
  useCommandPaletteHotkey(setPaletteOpen);

  // Poll for incoming shares + duel challenges.
  React.useEffect(() => {
    if (!auth.ready || auth.user.isGuest) return;
    let active = true;
    const storageKey = `sat-nexus-seen-shares:${auth.user.id}`;
    const duelKey = `sat-nexus-seen-duels:${auth.user.id}`;
    const checkForShares = async () => {
      try {
        const [questions, collections, duels] = await Promise.all([
          apiGet<{ received: { id: string; fromDisplayName?: string; fromEmail?: string }[] }>("/api/shared-questions"),
          apiGet<{ received: { id: string; fromDisplayName?: string; fromEmail?: string }[] }>("/api/shared-collections"),
          apiGet<{ inbox: { id: string; hostName?: string; hostEmail?: string; questionCount?: number }[] }>("/api/duels").catch(() => ({ inbox: [] as { id: string; hostName?: string; hostEmail?: string; questionCount?: number }[] })),
        ]);
        if (!active) return;
        const seen = new Set<string>(JSON.parse(localStorage.getItem(storageKey) || "[]"));
        const incoming = [
          ...questions.received.map((share) => ({ ...share, type: "question" as const })),
          ...collections.received.map((share) => ({ ...share, type: "collection" as const })),
        ];
        const newShares = incoming.filter((share) => !seen.has(share.id));
        if (newShares.length) {
          newShares.forEach((share) => toast(`New shared ${share.type}`, {
            description: `${share.fromDisplayName || share.fromEmail || "Someone"} shared a ${share.type} with you.`,
            action: { label: "View", onClick: () => { window.location.href = "/shared"; } },
          }));
        }
        localStorage.setItem(storageKey, JSON.stringify(incoming.map((share) => share.id)));

        const seenDuels = new Set<string>(JSON.parse(localStorage.getItem(duelKey) || "[]"));
        const newDuels = (duels.inbox ?? []).filter((d) => !seenDuels.has(d.id));
        if (newDuels.length) {
          newDuels.forEach((d) =>
            toast("Duel challenge!", {
              description: `${d.hostName || d.hostEmail || "Someone"} challenged you${d.questionCount ? ` · ${d.questionCount} Qs` : ""}.`,
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = "/duel";
                },
              },
            }),
          );
        }
        localStorage.setItem(duelKey, JSON.stringify((duels.inbox ?? []).map((d) => d.id)));
      } catch { /* A notification check should never interrupt the app. */ }
    };
    void checkForShares();
    const timer = window.setInterval(() => void checkForShares(), 20_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [auth.ready, auth.user.id, auth.user.isGuest]);

  // Track admin impersonation state (set from the admin console).
  React.useEffect(() => {
    const read = () => setImpersonating(getImpersonatedUser());
    read();
    window.addEventListener("sat-impersonation-changed", read);
    return () => window.removeEventListener("sat-impersonation-changed", read);
  }, []);

  // Settings dialog can restart the intro tutorial.
  React.useEffect(() => {
    const start = () => setTutorialForce(true);
    window.addEventListener("sat-start-tutorial", start);
    return () => window.removeEventListener("sat-start-tutorial", start);
  }, []);

  const accountLabel = auth.user.isGuest
    ? "Guest"
    : auth.user.displayName || auth.user.email || "Account";

  const navMode = settings.navMode;
  const showSidebar = navMode === "default";

  const confirmSignOut = () => setSignOutConfirm(true);
  const doSignOut = () => {
    setSignOutConfirm(false);
    void auth.signOut().then(() => toast.success("Signed out"));
  };

  return (
    <AccountGateProvider>
    <div className="min-h-screen" data-shell>
      {showSidebar && (
      <motion.aside
        data-tour="sidebar"
        initial={false}
        animate={{ width: desktopExpanded ? 236 : 74 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        onMouseEnter={() => setDesktopExpanded(true)}
        onMouseLeave={() => setDesktopExpanded(false)}
        className="shell-aside fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-[var(--line)] bg-[var(--paper-soft)] md:flex"
        style={desktopExpanded ? { boxShadow: "0 10px 28px rgba(20,24,34,0.16)" } : { boxShadow: "0 0 0 rgba(0,0,0,0)" }}
      >
        <Link href="/" className="flex items-center overflow-hidden whitespace-nowrap border-b border-[var(--line)] py-5">
          <div className="flex w-[74px] shrink-0 items-center justify-center">
            <img src="/favicon.ico" alt="Logo" className="h-[22px] w-[22px]" />
          </div>
          <motion.div
            initial={false}
            animate={{ opacity: desktopExpanded ? 1 : 0, width: desktopExpanded ? "auto" : 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden whitespace-nowrap"
          >
            <div className="font-display text-[19px] font-bold leading-none text-[var(--ink)]">SAT Nexus</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-faint)]">
              Web practice
            </div>
          </motion.div>
        </Link>

        <div className="min-h-0 flex-1 overflow-hidden py-5">
          <NavLinks compact={!desktopExpanded} isAdmin={auth.isAdmin} showGroupLabels={false} />
        </div>

        <div className="mt-auto border-t border-[var(--line)] py-3">
          <div
            data-tour="account"
            className={cn(
              "mb-2 flex min-h-[58px] overflow-hidden whitespace-nowrap rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] py-2.5 mx-auto",
              desktopExpanded ? "w-[calc(100%-24px)]" : "w-[58px]"
            )}
            title={accountLabel}
          >
            <div className="flex w-[58px] shrink-0 items-center justify-center">
              <UserRound className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div className={cn("min-w-0 grow transition-opacity duration-200", desktopExpanded ? "opacity-100" : "opacity-0")}>
              <div className="truncate text-[12.5px] font-bold text-[var(--ink)]">{accountLabel}</div>
              <div className="truncate text-[10.5px] text-[var(--ink-faint)]">
                {auth.user.isGuest ? "Local guest session" : auth.isAdmin ? "Admin account" : "Supabase account"}
              </div>
            </div>
          </div>
          {auth.user.isGuest ? (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="mb-1 mx-auto flex min-h-10 items-center overflow-hidden whitespace-nowrap rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-all duration-[0.25s] ease-[easeInOut] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
              style={{ width: desktopExpanded ? 'calc(100% - 24px)' : '58px' }}
              title="Sign in"
            >
              <div className="flex w-[58px] shrink-0 items-center justify-center">
                <LogIn className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
              </div>
              <span className={cn("transition-opacity duration-200", desktopExpanded ? "opacity-100" : "opacity-0")}>
                Sign in
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmSignOut}
              className="mb-1 mx-auto flex min-h-10 items-center overflow-hidden whitespace-nowrap rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-all duration-[0.25s] ease-[easeInOut] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
              style={{ width: desktopExpanded ? 'calc(100% - 24px)' : '58px' }}
              title="Sign out"
            >
              <div className="flex w-[58px] shrink-0 items-center justify-center">
                <LogOut className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
              </div>
              <span className={cn("transition-opacity duration-200", desktopExpanded ? "opacity-100" : "opacity-0")}>
                Sign out
              </span>
            </button>
          )}
          <button
            type="button"
            data-tour="palette"
            onClick={() => setPaletteOpen(true)}
            className="mb-1 mx-auto flex min-h-10 items-center overflow-hidden whitespace-nowrap rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-all duration-[0.25s] ease-[easeInOut] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
            style={{ width: desktopExpanded ? 'calc(100% - 24px)' : '58px' }}
            title="Go to"
          >
            <div className="flex w-[58px] shrink-0 items-center justify-center">
              <Search className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
            </div>
            <span
              className={cn(
                "flex min-w-0 grow items-center transition-opacity duration-200 pr-3",
                desktopExpanded ? "opacity-100" : "opacity-0",
              )}
            >
              Go to…
              <kbd className="ml-auto rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-faint)]">
                /
              </kbd>
            </span>
          </button>
          <button
            type="button"
            data-tour="settings"
            onClick={() => setSettingsOpen(true)}
            className="mx-auto flex min-h-10 items-center overflow-hidden whitespace-nowrap rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-all duration-[0.25s] ease-[easeInOut] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
            style={{ width: desktopExpanded ? 'calc(100% - 24px)' : '58px' }}
            title="Settings"
          >
            <div className="flex w-[58px] shrink-0 items-center justify-center">
              <Cog className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
            </div>
            <span className={cn("transition-opacity duration-200", desktopExpanded ? "opacity-100" : "opacity-0")}>
              Settings
            </span>
          </button>

        </div>
      </motion.aside>
      )}

      {/* Keyboard / dock nav modes: only the brand icon remains up top. */}
      {!showSidebar && (
        <div className="keyboard-nav-brand items-center gap-2">
          <Link href="/" className="flex h-9 w-9 items-center justify-center" title="SAT Nexus — Study desk">
            <img src="/favicon.ico" alt="Logo" className="h-[22px] w-[22px]" />
          </Link>
          {navMode === "keyboard" && (
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="btn btn-soft !min-h-9 !px-3 !py-1.5 !text-[12px]"
              title="Navigate (Ctrl+K or /)"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-faint)]">Ctrl K</kbd>
            </button>
          )}
        </div>
      )}

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--paper-soft)] px-4 md:hidden shell-header">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="flex h-8 w-8 items-center justify-center">
            <img src="/favicon.ico" alt="Logo" className="h-5 w-5" />
          </div>
          <span className="font-display text-[18px] font-bold text-[var(--ink)]">SAT Nexus</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (auth.user.isGuest ? setAuthOpen(true) : confirmSignOut())}
            className="rounded-[5px] border border-[var(--line)] bg-[var(--paper-raised)] p-2 text-[var(--ink-soft)]"
            aria-label={auth.user.isGuest ? "Sign in" : "Sign out"}
          >
            {auth.user.isGuest ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="rounded-[5px] border border-[var(--line)] bg-[var(--paper-raised)] p-2 text-[var(--ink-soft)]"
            aria-label="Open navigation"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-[5px] border border-[var(--line)] bg-[var(--paper-raised)] p-2 text-[var(--ink-soft)]"
            aria-label="Open settings"
          >
            <Cog className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-[5px] border border-[var(--line)] bg-[var(--paper-raised)] p-2 text-[var(--ink-soft)]"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
      {mobileOpen && (
        <motion.div
          className="fixed inset-0 top-14 z-30 bg-[rgba(37,40,44,0.32)] md:hidden"
          onClick={() => setMobileOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-x-0 top-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-[var(--line)] bg-[var(--paper-soft)] px-4 pb-10 pt-3 shadow-[0_10px_24px_rgba(37,40,44,0.16)]"
            onClick={(event) => event.stopPropagation()}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
          >
            <div className="mb-2 flex items-center justify-between border-b border-[var(--line-soft)] pb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-[6px] border border-[var(--line)] bg-[var(--paper-raised)] p-2 text-[var(--ink-soft)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} isAdmin={auth.isAdmin} />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {impersonating && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-[#d2abb7] bg-[#f0dfe5] px-4 py-2 text-[13px] font-semibold text-[#8e5264]">
          <ShieldCheck className="h-4 w-4" />
          Viewing as {impersonating.label}
          <button
            type="button"
            className="btn btn-danger !min-h-7 !px-3 !py-1 !text-[11.5px]"
            onClick={() => {
              setImpersonatedUser(null);
              mutateKey("stats");
              mutateKey("favorites");
              mutateKey("collections");
              mutateKey("mistakes");
              toast.success("Back to your own account");
            }}
          >
            Exit
          </button>
        </div>
      )}

      <main className={cn("shell-main px-4 pb-10 pt-6 sm:px-6 md:px-8 md:py-8 flex flex-col min-h-[calc(100vh-3.5rem)]", showSidebar && "md:ml-[74px] md:min-h-screen", !showSidebar && "md:pt-16")}>
        <div className="mx-auto w-full max-w-[1180px] flex-grow">{children}</div>
        <Footer />
      </main>

      {navMode === "dock" && (
        <NavDock onOpenSettings={() => setSettingsOpen(true)} onOpenPalette={() => setPaletteOpen(true)} />
      )}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <FloatingStudyTimer />
      <PresenceTracker />
      <IntroTutorial forceOpen={tutorialForce} onClose={() => setTutorialForce(false)} />

      <PaperDialog
        open={signOutConfirm}
        onOpenChange={setSignOutConfirm}
        title="Sign out?"
        description="Are you sure you want to sign out? Your synced progress stays safe in your account."
      >
        <div className="mt-5 flex gap-2.5">
          <button type="button" className="btn btn-danger grow" onClick={doSignOut}>
            <LogOut className="h-4 w-4" /> Yes, sign out
          </button>
          <button type="button" className="btn btn-soft grow" onClick={() => setSignOutConfirm(false)}>
            No, stay signed in
          </button>
        </div>
      </PaperDialog>
    </div>
    </AccountGateProvider>
  );
}
