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

function NavLinks({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!compact && (
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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [desktopExpanded, setDesktopExpanded] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [authOpen, setAuthOpen] = React.useState(false);
  useCommandPaletteHotkey(setPaletteOpen);

  const accountLabel = auth.user.isGuest
    ? "Guest"
    : auth.user.displayName || auth.user.email || "Account";

  return (
    <div className="min-h-screen" data-shell>
      <aside
        className={cn(
          "shell-aside fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--line)] bg-[var(--paper-soft)] transition-[width,box-shadow] duration-250 ease-out md:flex",
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

        <div className={cn("flex-1 overflow-y-auto py-5 scrollbar-thin", desktopExpanded ? "px-3" : "px-2")}>
          <NavLinks compact={!desktopExpanded} />
        </div>

        <div className={cn("border-t border-[var(--line)] py-3", desktopExpanded ? "px-3" : "px-2")}>
          <div
            className={cn(
              "mb-2 flex rounded-[8px] border border-[var(--line)] bg-[var(--paper-raised)] py-2.5",
              desktopExpanded ? "items-center gap-2 px-3" : "items-center justify-center px-2",
            )}
            title={accountLabel}
          >
            <UserRound className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            {desktopExpanded && (
              <div className="min-w-0 grow">
                <div className="truncate text-[12.5px] font-bold text-[var(--ink)]">{accountLabel}</div>
                <div className="truncate text-[10.5px] text-[var(--ink-faint)]">
                  {auth.user.isGuest ? "Local guest session" : "CloudBase account"}
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
              onClick={() => {
                void auth.signOut().then(() => toast.success("Signed out"));
              }}
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
            onClick={() => setSettingsOpen(true)}
            className={cn(
              "flex min-h-10 w-full rounded-[6px] py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
              desktopExpanded ? "items-center gap-3 px-3" : "justify-center px-2",
            )}
            title="Settings"
          >
            <Settings2 className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
            {desktopExpanded && "Settings"}
          </button>
          {desktopExpanded && (
            <p className="mt-2 px-3 text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
              Browser app · Vercel + CloudBase ready
            </p>
          )}
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

      <main className="shell-main px-4 py-6 sm:px-6 md:ml-[74px] md:px-8 md:py-8">
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
    </div>
  );
}
