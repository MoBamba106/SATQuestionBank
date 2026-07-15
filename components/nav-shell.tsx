"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { UploadCloud, Library, FlaskConical, BarChart3, Sparkles, Search, Command, Zap, Trophy, BookOpen, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBank } from "@/lib/store";
import { CommandPalette } from "@/components/command-palette";

const nav = [
  { href: "/bank", label: "Question Bank", icon: Library, desc: "Browse" },
  { href: "/quiz", label: "Quiz", icon: FlaskConical, desc: "Practice" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, desc: "Progress" },
];

const secondaryNav = [
  { href: "/study-sessions", label: "Study Sessions", icon: Zap, desc: "Quick Start" },
  { href: "/collections", label: "Collections", icon: BookOpen, desc: "Organize" },
  { href: "/mistakes", label: "Mistakes", icon: AlertCircle, desc: "Review" },
  { href: "/achievements", label: "Achievements", icon: Trophy, desc: "Unlock" },
  { href: "/bluebook", label: "Bluebook", icon: BookOpen, desc: "Official Tests" },
];

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const questions = useBank(s=>s.questions);
  const syncFromServer = useBank(s=>s.syncFromServer);
  const clearSynthetic = useBank(s=>s.clearSynthetic);
  React.useEffect(()=>{ clearSynthetic(); syncFromServer(); }, [syncFromServer, clearSynthetic]);
  const answered = questions.reduce((a,q)=>a+q.timesAnswered,0);
  const bankCount = questions.length;
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[296px] shrink-0 flex-col border-r border-paper-300 bg-[#fdfcfa]/90 backdrop-blur relative z-20">
        <div className="h-[72px] flex items-center px-7 glass-subtle border-b border-paper-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#3a6fe3] via-[#7d5ae6] to-[#e56a8a] flex items-center justify-center shadow-paper">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="font-display font-[650] text-[17px] tracking-tight text-ink">SAT NEXUS</div>
              <div className="text-[10px] uppercase tracking-[.18em] text-ink-faint">v1.8 · Soft Paper</div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"/>
            <input placeholder="Quick jump ⌘K"
              className="w-full bg-white text-ink border border-paper-300 rounded-xl pl-9 pr-10 py-[11px] text-sm outline-none focus:border-[#5b8def] transition-all placeholder:text-ink-faint"
              onClick={() => {
                const event = new CustomEvent("openCommandPalette");
                window.dispatchEvent(event);
              }}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-faint bg-paper-100 px-1.5 py-0.5 rounded border border-paper-300 cursor-pointer" onClick={() => {
              const event = new CustomEvent("openCommandPalette");
              window.dispatchEvent(event);
            }}>⌘K</span>
          </div>
        </div>

        <nav className="px-4 space-y-1.5">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="block relative group">
                {active && (
                  <motion.div layoutId="nav-active"
                    className="absolute inset-0 rounded-[14px] bg-white border border-paper-300 shadow-paper"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <div className={cn(
                  "relative px-4 py-3 rounded-[14px] flex items-center gap-3 transition-all",
                  active ? "text-ink" : "text-ink-soft hover:text-ink"
                )}>
                  <item.icon size={18} className={active ? "text-[#3a6fe3]" : ""}/>
                  <div className="flex-1">
                    <div className="text-[14px] font-[520]">{item.label}</div>
                    <div className="text-[11px] text-ink-faint">{item.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <nav className="px-4 space-y-1.5 mt-6 pt-6 border-t border-paper-300">
          <div className="px-4 py-2 text-[11px] uppercase tracking-wider text-ink-faint font-[600]">Tools</div>
          {secondaryNav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="block relative group">
                {active && (
                  <motion.div layoutId="nav-active-secondary"
                    className="absolute inset-0 rounded-[14px] bg-white border border-paper-300 shadow-paper"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <div className={cn(
                  "relative px-4 py-3 rounded-[14px] flex items-center gap-3 transition-all text-sm",
                  active ? "text-ink" : "text-ink-soft hover:text-ink"
                )}>
                  <item.icon size={16} className={active ? "text-[#3a6fe3]" : ""}/>
                  <div className="flex-1">
                    <div className="text-[13px] font-[500]">{item.label}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-5 space-y-3">
          <div className="glass rounded-[18px] p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink-faint mb-2">Question Bank</div>
            <div className="text-2xl font-display font-[650] text-ink">{bankCount.toLocaleString()}</div>
            <div className="text-[12px] text-ink-soft">{answered} answered</div>
            <div className="mt-3 h-[5px] rounded-full bg-paper-200 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-[#3a6fe3] to-[#2ca974]"
                initial={{ width: "0%" }} animate={{ width: answered ? "18%" : "0%" }} transition={{ duration: 1.0, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="text-[11px] text-ink-faint px-1">
            Official College Board • Soft Paper
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 glass-subtle border-b border-paper-300">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="font-display font-[650] text-ink">SAT NEXUS</div>
          <div className="flex gap-4 text-ink-soft">
            {nav.map(n => (
              <Link key={n.href} href={n.href} className={cn(pathname.startsWith(n.href) && "text-[#3a6fe3]")}>
                <n.icon size={18}/>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <CommandPalette />
        {children}
      </main>
    </div>
  );
}
