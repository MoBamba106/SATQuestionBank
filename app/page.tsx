"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { UploadCloud, Library, FlaskConical, BarChart3, ArrowRight, Zap, Trophy, BookOpen, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export default function Home() {
  return (
    <div className="px-6 lg:px-12 py-10 lg:py-16 max-w-7xl mx-auto">
      <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.6}}>
        <div className="text-[12px] uppercase tracking-[0.22em] text-neon-cyan mb-3 neon-text-cyan">SAT NEXUS • College Board Official</div>
        <h1 className="text-[44px] lg:text-[64px] font-display font-[700] leading-[0.95] tracking-tight">
          Premium SAT<br/>Question Bank,<br/>
          <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">cyberpunk grade.</span>
        </h1>
        <p className="mt-6 text-zinc-400 max-w-2xl text-[17px] leading-relaxed">
          OCR import from screenshots & PDFs • Desmos built-in • Official College Board domains • Spaced repetition ready • 20,000+ question scale.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/upload" className="px-5 py-3 rounded-2xl bg-neon-cyan text-black font-[600] shadow-neon-cyan flex items-center gap-2">
            Import Questions <ArrowRight size={16}/>
          </Link>
          <Link href="/bank" className="px-5 py-3 rounded-2xl glass">Open Bank</Link>
          <Link href="/quiz" className="px-5 py-3 rounded-2xl glass-subtle">Start Quiz</Link>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
        {[
          {icon: UploadCloud, title:"OCR Import", desc:"Tesseract.js modular • PDF split • confidence highlighting", href:"/upload", c:"text-neon-cyan"},
          {icon: Library, title:"Question Bank", desc:"Glassmorphism cards • live search • official CB categories", href:"/bank", c:"text-neon-purple"},
          {icon: FlaskConical, title:"Digital SAT Quiz", desc:"Timed • flag • confidence • Desmos embedded", href:"/quiz", c:"text-neon-green"},
          {icon: BarChart3, title:"Practice Analytics", desc:"Score progression • predicted SAT • readiness 1400-1600", href:"/analytics", c:"text-neon-amber"},
        ].map((card,i)=>(
          <GlassCard key={card.title} hover>
            <Link href={card.href} className="block p-6">
              <card.icon className={card.c} />
              <div className="mt-4 font-[600] text-[16px]">{card.title}</div>
              <div className="text-[13px] text-zinc-400 mt-2 leading-relaxed">{card.desc}</div>
            </Link>
          </GlassCard>
        ))}
      </div>

      {/* New Features Section */}
      <div className="mt-16">
        <h2 className="text-[32px] font-display font-[700] mb-6">New Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {icon: Zap, title:"Study Sessions", desc:"Quick 10 • Math Warmup • Hard Practice • Review Mistakes", href:"/study-sessions", c:"text-yellow-400"},
            {icon: BookOpen, title:"Collections", desc:"Organize questions into custom folders and collections", href:"/collections", c:"text-blue-400"},
            {icon: AlertCircle, title:"Mistake Bank", desc:"Auto-collect wrong answers • filter by domain & time", href:"/mistakes", c:"text-red-400"},
            {icon: Trophy, title:"Achievements", desc:"Unlock badges • streaks • milestones • progress tracking", href:"/achievements", c:"text-yellow-500"},
          ].map((card,i)=>(
            <GlassCard key={card.title} hover>
              <Link href={card.href} className="block p-6">
                <card.icon className={card.c} />
                <div className="mt-4 font-[600] text-[16px]">{card.title}</div>
                <div className="text-[13px] text-zinc-400 mt-2 leading-relaxed">{card.desc}</div>
              </Link>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Bluebook Section */}
      <div className="mt-16">
        <GlassCard className="p-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[24px] font-display font-[700] mb-2">📖 Official Bluebook SAT Practice Tests</h3>
              <p className="text-zinc-300 mb-4">Take full-length official SAT practice tests with authentic timing and scoring. Review detailed analytics after completion.</p>
              <Link href="/bluebook" className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white font-[600] hover:bg-blue-700 transition">
                Start Practice Test <ArrowRight size={16}/>
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="mt-16 grid lg:grid-cols-3 gap-5 text-sm">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="text-zinc-400 text-[12px] uppercase tracking-wider mb-3">Official SAT Domains</div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="text-neon-cyan font-[600] mb-2">Reading & Writing</div>
              <ul className="space-y-1 text-zinc-300">
                <li>• Information and Ideas</li>
                <li>• Craft and Structure</li>
                <li>• Expression of Ideas</li>
                <li>• Standard English Conventions</li>
              </ul>
            </div>
            <div>
              <div className="text-neon-purple font-[600] mb-2">Math</div>
              <ul className="space-y-1 text-zinc-300">
                <li>• Algebra</li>
                <li>• Advanced Math</li>
                <li>• Problem-Solving and Data Analysis</li>
                <li>• Geometry and Trigonometry</li>
              </ul>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="text-[12px] uppercase tracking-wider text-zinc-400 mb-3">Tech Stack</div>
          <div className="text-zinc-300 text-[13px] leading-relaxed">
            Next.js 14 • React • TypeScript<br/>
            Tailwind • Framer Motion • GSAP<br/>
            Tesseract.js OCR • Recharts<br/>
            Prisma • SQLite • Desmos API
          </div>
        </GlassCard>
      </div>

      <div className="mt-14 text-center text-zinc-500 text-[12px]">
        Built for scale • 20k+ Q virtualization • keyboard-first (⌘K) • a11y ready • export JSON/CSV • Keyboard shortcuts: / (search) N (next) P (prev) F (flag) SPACE (check) A-D (answers)
      </div>
    </div>
  );
}
