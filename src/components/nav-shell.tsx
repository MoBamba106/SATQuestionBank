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
  Settings2,
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
import { toast } from "sonner";
import { GlobalDock } from "@/components/global-dock";

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
      { href: "/achievements", label: "Achievements", icon: Trophy },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-10 items-center gap-3 border-l-[3px] px-3 py-2 text-[13.5px] font-semibold transition-colors",
                    active
                      ? "nav-link-active"
                      : "border-transparent text-[var(--ink-soft)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
                  )}
                >
                  <Icon
                    className={cn("nav-item-icon h-[17px] w-[17px] shrink-0", active ? "text-[var(--accent)]" : "text-[var(--ink-faint)]")}
                    strokeWidth={active ? 2.3 : 2}
                  />
                  {label}
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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  useCommandPaletteHotkey(setPaletteOpen);

  const accountLabel = auth.user.isGuest
    ? "Guest"
    : auth.user.displayName || auth.user.email || "Account";

  return (
    <div className="min-h-screen" data-shell>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-[var(--line)] bg-[var(--paper-soft)] md:flex shell-aside">
        <Link href="/" className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-5">
          <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-[6px]">
            <BookOpenText className="h-[19px] w-[19px] text-white" strokeWidth={2.1} />
          </div>
          <div>
            <div className="font-display text-[19px] font-bold leading-none text-[var(--ink)]">SAT Nexus</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-faint)]">
              Web practice
            </div>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
          <NavLinks />
        </div>

        <div className="border-t border-[var(--line)] px-3 py-3">
          <div className="mb-2 flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-2.5">
            <UserRound className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0 grow">
              <div className="truncate text-[12.5px] font-bold text-[var(--ink)]">{accountLabel}</div>
              <div className="truncate text-[10.5px] text-[var(--ink-faint)]">
                {auth.user.isGuest ? "Local guest session" : "CloudBase account"}
              </div>
            </div>
          </div>
          {auth.user.isGuest ? (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="mb-1 flex min-h-10 w-full items-center gap-3 rounded-[6px] px-3 py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
            >
              <LogIn className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
              Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void auth.signOut().then(() => toast.success("Signed out"));
              }}
              className="mb-1 flex min-h-10 w-full items-center gap-3 rounded-[6px] px-3 py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
            >
              <LogOut className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
              Sign out
            </button>
          )}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="mb-1 flex min-h-10 w-full items-center gap-3 rounded-[6px] px-3 py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
          >
            <Search className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
            Go to…
            <kbd className="ml-auto rounded border border-[var(--line)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-faint)]">
              /
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex min-h-10 w-full items-center gap-3 rounded-[6px] px-3 py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
          >
            <Settings2 className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
            Settings
          </button>
          <p className="mt-2 px-3 text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
            Browser app · Vercel + CloudBase ready
          </p>
        </div>
      </aside>

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
            onClick={() => (auth.user.isGuest ? setAuthOpen(true) : void auth.signOut())}
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
            <Settings2 className="h-4 w-4" />
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
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 md:ml-[236px] md:px-8 md:py-8 shell-main">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <FloatingStudyTimer />
      <GlobalDock />
    </div>
  );
}
