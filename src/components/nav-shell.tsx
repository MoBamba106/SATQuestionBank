"use client";

import * as React from "react";
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
import { getImpersonatedUser, setImpersonatedUser, mutateKey } from "@/lib/api-client";
import { toast } from "sonner";

const NAV_GROUPS = [
  {
    label: "Study",
    items: [
      { href: "/", label: "Study desk", icon: LayoutDashboard },
      { href: "/study", label: "Study library", icon: BookMarked },
      { href: "/quiz", label: "Practice quiz", icon: PenSquare },
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
  {
    label: "Community",
    items: [{ href: "/feedback", label: "Feedback", icon: MessageSquarePlus }],
  },
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
    if (!isAdmin) return NAV_GROUPS;
    return [
      ...NAV_GROUPS,
      { label: "Admin", items: [{ href: "/admin", label: "Admin console", icon: ShieldCheck }] },
    ];
  }, [isAdmin]);

  return (
    <nav aria-label="Primary navigation" className={cn(showGroupLabels ? "space-y-5" : "space-y-0.5")}>
      {groups.map((group) => (
        <div key={group.label}>
          {!compact && showGroupLabels && (
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              {group.label}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={label}
                  aria-label={compact ? label : undefined}
                  className={cn(
                    "relative flex min-h-10 items-center gap-3 border-l-[3px] py-2 text-[13.5px] font-semibold transition-colors",
                    compact ? "justify-center px-2" : "px-3",
                    active
                      ? "nav-link-active"
                      : "border-transparent text-[var(--ink-soft)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
                  )}
                >
                  <Icon
                    className={cn("nav-item-icon h-[17px] w-[17px] shrink-0", active ? "text-[var(--accent)]" : "text-[var(--ink-faint)]")}
                    strokeWidth={active ? 2.3 : 2}
                  />
                  {!compact && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
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
      <aside
        data-tour="sidebar"
        className={cn(
          "shell-aside fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden transition-[width,box-shadow] duration-300 ease-out will-change-[width] md:flex",
          desktopExpanded ? "w-[236px] shadow-[0_10px_28px_rgba(20,24,34,0.16)]" : "w-[74px]",
        )}
        onMouseEnter={() => setDesktopExpanded(true)}
        onMouseLeave={() => setDesktopExpanded(false)}
      >
        <Link href="/" className={cn("flex items-center border-b border-[var(--line)] py-5", desktopExpanded ? "gap-3 px-5" : "justify-center px-2")}>
          <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-[6px]">
            <BookOpenText className="h-[19px] w-[19px] text-white" strokeWidth={2.1} />
          </div>
          {desktopExpanded && (
            <div>
              <div className="font-display text-[19px] font-bold leading-none text-[var(--ink)]">SAT Nexus</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-faint)]">
                Web practice
              </div>
            </div>
          )}
        </Link>

        <div className={cn("min-h-0 flex-1 overflow-hidden py-5", desktopExpanded ? "px-3" : "px-2")}>
          <NavLinks compact={!desktopExpanded} isAdmin={auth.isAdmin} showGroupLabels={false} />
        </div>

        <div className={cn("mt-auto border-t border-[var(--line)] py-3", desktopExpanded ? "px-3" : "px-2")}>
          <div
            data-tour="account"
            className={cn(
              "mb-2 flex min-h-[58px] rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] py-2.5",
              desktopExpanded ? "items-center gap-2 px-3" : "items-center justify-center px-2",
            )}
            title={accountLabel}
          >
            <UserRound className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            {desktopExpanded && (
              <div className="min-w-0 grow">
                <div className="truncate text-[12.5px] font-bold text-[var(--ink)]">{accountLabel}</div>
                <div className="truncate text-[10.5px] text-[var(--ink-faint)]">
                  {auth.user.isGuest ? "Local guest session" : auth.isAdmin ? "Admin account" : "Supabase account"}
                </div>
              </div>
            )}
          </div>
          {auth.user.isGuest ? (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className={cn(
                "mb-1 flex min-h-10 w-full rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
                desktopExpanded ? "items-center gap-3 px-3" : "justify-center px-2",
              )}
              title="Sign in"
            >
              <LogIn className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
              {desktopExpanded && "Sign in"}
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmSignOut}
              className={cn(
                "mb-1 flex min-h-10 w-full rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
                desktopExpanded ? "items-center gap-3 px-3" : "justify-center px-2",
              )}
              title="Sign out"
            >
              <LogOut className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
              {desktopExpanded && "Sign out"}
            </button>
          )}
          <button
            type="button"
            data-tour="palette"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              "mb-1 flex min-h-10 w-full rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
              desktopExpanded ? "items-center gap-3 px-3" : "justify-center px-2",
            )}
            title="Go to"
          >
            <Search className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
            {desktopExpanded && (
              <>
                Go to…
                <kbd className="ml-auto rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-faint)]">
                  /
                </kbd>
              </>
            )}
          </button>
          <button
            type="button"
            data-tour="settings"
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "flex min-h-10 w-full rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
              desktopExpanded ? "items-center gap-3 px-3" : "justify-center px-2",
            )}
            title="Settings"
          >
            <Cog className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
            {desktopExpanded && "Settings"}
          </button>

        </div>
      </aside>
      )}

      {/* Keyboard / dock nav modes: only the brand icon remains up top. */}
      {!showSidebar && (
        <div className="keyboard-nav-brand items-center gap-2">
          <Link href="/" className="brand-mark flex h-9 w-9 items-center justify-center rounded-[6px]" title="SAT Nexus — Study desk">
            <BookOpenText className="h-[19px] w-[19px] text-white" strokeWidth={2.1} />
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
          <div className="brand-mark flex h-8 w-8 items-center justify-center rounded-[5px]">
            <BookOpenText className="h-4 w-4 text-white" />
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

      {mobileOpen && (
        <div className="fixed inset-0 top-14 z-30 bg-[rgba(37,40,44,0.28)] md:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute inset-x-0 top-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-[var(--line)] bg-[var(--paper-soft)] p-4 shadow-[0_10px_24px_rgba(37,40,44,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <NavLinks onNavigate={() => setMobileOpen(false)} isAdmin={auth.isAdmin} />
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--paper-soft)]/95 px-2 py-2 shadow-[0_-10px_22px_rgba(37,40,44,0.10)] backdrop-blur md:hidden" aria-label="Mobile quick navigation">
        <div className="grid grid-cols-5 gap-1">
          {[
            { href: "/", label: "Home", icon: LayoutDashboard },
            { href: "/quiz", label: "Quiz", icon: PenSquare },
            { href: "/bank", label: "Bank", icon: Library },
            { href: "/mistakes", label: "Review", icon: RotateCcw },
            { href: "/analytics", label: "Stats", icon: BarChart3 },
          ].map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[8px] text-[10.5px] font-bold transition-colors",
                  active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-faint)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

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

      <main className={cn("shell-main px-4 pb-24 pt-6 sm:px-6 md:px-8 md:py-8", showSidebar && "md:ml-[74px]", !showSidebar && "md:pt-16")}>
        <div className="mx-auto max-w-[1180px]">{children}</div>
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
