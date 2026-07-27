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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "@/components/settings-dialog";
import { FloatingStudyTimer } from "@/components/floating-study-timer";

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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-[var(--line)] bg-[var(--paper-soft)] md:flex">
        <Link href="/" className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-5">
          <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-[6px]">
            <BookOpenText className="h-[19px] w-[19px] text-white" strokeWidth={2.1} />
          </div>
          <div>
            <div className="font-display text-[19px] font-bold leading-none text-[var(--ink)]">SAT Nexus</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-faint)]">
              Practice desk
            </div>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
          <NavLinks />
        </div>

        <div className="border-t border-[var(--line)] px-3 py-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex min-h-10 w-full items-center gap-3 rounded-[6px] px-3 py-2 text-[13.5px] font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]"
          >
            <Settings2 className="h-[17px] w-[17px] text-[var(--ink-faint)]" />
            Settings
          </button>
          <p className="mt-2 px-3 text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
            Official question-bank practice with locally saved progress.
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--paper-soft)] px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="brand-mark flex h-8 w-8 items-center justify-center rounded-[5px]">
            <BookOpenText className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-[18px] font-bold text-[var(--ink)]">SAT Nexus</span>
        </Link>
        <div className="flex items-center gap-2">
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

      <main className="px-4 py-6 sm:px-6 md:ml-[236px] md:px-8 md:py-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <FloatingStudyTimer />
    </div>
  );
}
