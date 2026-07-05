"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { UploadCloud, Library, FlaskConical, BarChart3, Sparkles, Search, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBank } from "@/lib/store";

const nav = [
  { href: "/bank", label: "Question Bank", icon: Library, desc: "Browse" },
  { href: "/quiz", label: "Quiz", icon: FlaskConical, desc: "Practice" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, desc: "Progress" },
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
      <aside className="hidden lg:flex w-[296px] shrink-0 flex-col border-r border-surface-border relative z-20">
        <div className="h-[72px] flex items-center px-7 glass-subtle border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-neon-cyan via-neon-blue to-neon-purple flex items-center justify-center neon-glow-cyan">
              <Sparkles size={18} className="text-black" />
            </div>
            <div>
              <div className="font-display font-[650] text-[17px] tracking-tight">SAT NEXUS</div>
              <div className="text-[10px] uppercase tracking-[.18em] text-zinc-400">v1 · cyber</div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input placeholder="Quick jump ⌘K"
              className="w-full bg-[#0e1214] border border-surface-border rounded-xl pl-9 pr-10 py-[11px] text-sm outline-none focus:border-neon-cyan/50 focus:shadow-neon-cyan transition-all placeholder:text-zinc-500"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 bg-zinc-800/70 px-1.5 py-0.5 rounded border border-zinc-700">⌘K</span>
          </div>
        </div>

        <nav className="px-4 space-y-1.5">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className="block relative group">
                {active && (
                  <motion.div layoutId="nav-active"
                    className="absolute inset-0 rounded-[14px] glass neon-border"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                  />
                )}
                <div className={cn(
                  "relative px-4 py-3 rounded-[14px] flex items-center gap-3 transition-all",
                  active ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                )}>
                  <item.icon size={18} className={active ? "text-neon-cyan" : ""}/>
                  <div className="flex-1">
                    <div className="text-[14px] font-[520]">{item.label}</div>
                    <div className="text-[11px] text-zinc-500">{item.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-5 space-y-3">
          <div className="glass rounded-[18px] p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink-faint mb-2">Question Bank</div>
            <div className="text-2xl font-display font-[650] text-white">{bankCount}</div>
            <div className="text-[12px] text-ink-soft">{answered} answered</div>
            <div className="mt-3 h-[5px] rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-[#4a9eff] to-[#22c55e]"
                initial={{ width: "0%" }} animate={{ width: answered ? "18%" : "0%" }} transition={{ duration: 1.0, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className="text-[11px] text-ink-faint px-1">
            Official College Board • WCAG AA
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 glass-subtle border-b border-surface-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="font-display font-[650]">SAT NEXUS</div>
          <div className="flex gap-4 text-zinc-400">
            {nav.map(n => (
              <Link key={n.href} href={n.href} className={cn(pathname.startsWith(n.href) && "text-neon-cyan")}>
                <n.icon size={18}/>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
