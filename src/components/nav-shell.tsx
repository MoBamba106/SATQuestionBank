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
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quiz", label: "Practice Quiz", icon: PenSquare },
  { href: "/bank", label: "Question Bank", icon: Library },
  { href: "/bluebook", label: "Bluebook Tests", icon: MonitorSmartphone },
  { href: "/collections", label: "Collections", icon: Folders },
  { href: "/mistakes", label: "Mistake Bank", icon: RotateCcw },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/study-sessions", label: "Study Sessions", icon: CalendarClock },
  { href: "/achievements", label: "Achievements", icon: Trophy },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-all duration-150",
              active
                ? "bg-[#f0ead9] text-[#3053ad] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                : "text-[#55524a] hover:bg-[#f5f1e6] hover:text-[#2b2b2a]",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-[60%] w-[3.5px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[#7aa5f2] to-[#3a5fc8]" />
            )}
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:scale-110",
                active ? "text-[#3a5fc8]" : "text-[#8a8680] group-hover:text-[#55524a]",
              )}
              strokeWidth={active ? 2.4 : 2}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#e7e0d0] bg-[#fbf9f4]/90 backdrop-blur-md md:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7aa5f2] to-[#3a5fc8] shadow-[0_4px_12px_rgba(58,95,200,0.35)]">
            <GraduationCap className="h-5.5 w-5.5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display text-[19px] font-bold leading-tight text-[#2b2b2a]">
              SAT Nexus
            </div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#8a8680]">
              Soft Paper v2
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          <NavLinks />
        </div>
        <div className="border-t border-[#e7e0d0] px-5 py-4">
          <p className="text-[11px] leading-relaxed text-[#8a8680]">
            3,444 official College Board questions · 9 full-length practice tests
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#e7e0d0] bg-[#fbf9f4]/95 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#7aa5f2] to-[#3a5fc8]">
            <GraduationCap className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
          </div>
          <span className="font-display text-[17px] font-bold text-[#2b2b2a]">SAT Nexus</span>
        </Link>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-lg p-2 text-[#55524a] hover:bg-[#f2ecdd]"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="paper-fade fixed inset-0 z-30 bg-[rgba(43,40,33,0.25)] md:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="paper-pop absolute inset-x-3 top-16 rounded-2xl border border-[#e2dbc9] bg-[#fffdf8] p-3 shadow-paper-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="px-4 py-6 sm:px-6 md:pl-[272px] md:pr-8 md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
