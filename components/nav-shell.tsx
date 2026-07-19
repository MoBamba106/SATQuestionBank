"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Library, FlaskConical, BarChart3, Sparkles, Search, Zap, Trophy, BookOpen, AlertCircle } from "lucide-react";
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
  
  React.useEffect(()=>{ 
    clearSynthetic(); 
    syncFromServer(); 
  }, [syncFromServer, clearSynthetic]);

  const answered = questions.reduce((a,q)=>a+(q.timesAnswered || 0),0);
  const bankCount = questions.length;

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[296px] shrink-0 flex-col border-r border-paper-300 bg-paper/80 backdrop-blur-xl sticky top-0 h-screen z-20">
        <div className="h-[72px] flex items-center px-7 border-b border-paper-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-green flex items-center justify-center shadow-lg shadow-blue-100">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-xl tracking-tight text-ink">SAT NEXUS</div>
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">Soft Paper v2.0</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="relative group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint group-focus-within:text-neon-cyan transition-colors"/>
            <div 
              className="w-full bg-white text-ink-soft border border-paper-300 rounded-2xl pl-11 pr-4 py-3 text-sm cursor-pointer hover:border-paper-400 transition-all flex items-center justify-between"
              onClick={() => {
                const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' });
                window.dispatchEvent(event);
              }}
            >
              <span>Quick jump...</span>
              <span className="text-[10px] font-bold text-ink-faint bg-paper-100 px-2 py-1 rounded-lg border border-paper-200">⌘K</span>
            </div>
          </div>
        </div>

        <nav className="px-4 space-y-2">
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-ink-faint font-bold">Main</div>
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="block relative group">
                {active && (
                  <motion.div layoutId="nav-active"
                    className="absolute inset-0 rounded-2xl bg-white border border-paper-300 shadow-xl shadow-paper-200"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <div className={cn(
                  "relative px-4 py-3 rounded-2xl flex items-center gap-4 transition-all",
                  active ? "text-ink" : "text-ink-soft hover:text-ink hover:bg-white/50"
                )}>
                  <item.icon size={20} className={active ? "text-neon-cyan" : "text-ink-faint group-hover:text-ink-soft"}/>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{item.label}</div>
                    <div className="text-[10px] text-ink-faint font-medium">{item.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <nav className="px-4 space-y-2 mt-8 pt-8 border-t border-paper-200">
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-ink-faint font-bold">Practice</div>
          {secondaryNav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="block relative group">
                {active && (
                  <motion.div layoutId="nav-active-secondary"
                    className="absolute inset-0 rounded-2xl bg-white border border-paper-300 shadow-xl shadow-paper-200"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <div className={cn(
                  "relative px-4 py-3 rounded-2xl flex items-center gap-4 transition-all",
                  active ? "text-ink" : "text-ink-soft hover:text-ink hover:bg-white/50"
                )}>
                  <item.icon size={18} className={active ? "text-neon-cyan" : "text-ink-faint group-hover:text-ink-soft"}/>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{item.label}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-6">
          <div className="bg-white/50 rounded-3xl p-6 border border-paper-200 shadow-inner">
            <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold mb-3">Overall Progress</div>
            <div className="text-3xl font-display font-bold text-ink mb-1">{bankCount.toLocaleString()}</div>
            <div className="text-[11px] text-ink-soft font-bold uppercase tracking-wider">{answered} Questions Answered</div>
            <div className="mt-4 h-2 rounded-full bg-paper-200 overflow-hidden shadow-inner">
              <motion.div className="h-full bg-gradient-to-r from-neon-cyan to-neon-green"
                initial={{ width: "0%" }} 
                animate={{ width: bankCount ? `${(answered / bankCount) * 100}%` : "0%" }} 
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-paper/80 backdrop-blur-xl border-b border-paper-200">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="font-display font-bold text-xl text-ink">SAT NEXUS</div>
          <div className="flex gap-6 text-ink-soft">
            {nav.map(n => (
              <Link key={n.href} href={n.href} className={cn(pathname.startsWith(n.href) && "text-neon-cyan")}>
                <n.icon size={20}/>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <CommandPalette />
        {children}
      </main>
    </div>
  );
}
