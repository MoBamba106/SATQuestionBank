"use client";
import { GlassCard } from "@/components/ui/glass-card";
import Link from "next/link";

export default function UploadPage() {
  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl mx-auto">
      <h1 className="text-[32px] font-display font-[680] tracking-tight text-ink">Question Import</h1>
      <p className="text-ink-soft mt-2">OCR has been removed per SAT Nexus spec. Use the official College Board API scraper.</p>

      <GlassCard className="p-7 mt-7">
        <div className="text-[13px] uppercase tracking-wider text-ink-soft mb-3">College Board full bank</div>
        <div className="text-[15px] text-ink leading-relaxed space-y-3">
          <p>Run in your terminal:</p>
          <pre className="bg-[#f7f3ea] border border-paper-300 rounded-xl p-4 text-[13px] font-mono text-ink overflow-x-auto">
{`# 1) import 3,444 CB questions
npm run cb:full

# 2) start the app
npm run dev

# Bank auto-syncs from /api/questions`}
          </pre>
          <p className="text-ink-soft text-[13px]">
            Scraper hits <code>qbank-api.collegeboard.org</code> directly, preserves HTML (tables, graphs, MathML), 
            maps official domains: Algebra, Advanced Math, Problem-Solving and Data Analysis, Geometry and Trigonometry,
            and R&W: Information and Ideas, Craft and Structure, Expression of Ideas, Standard English Conventions.
          </p>
        </div>
        <div className="flex gap-3 mt-5">
          <Link href="/bank" className="px-4 py-2 rounded-xl bg-[#3a6fe3] text-white text-sm font-[600]">Open Question Bank →</Link>
          <Link href="/quiz" className="px-4 py-2 rounded-xl glass-subtle text-sm text-ink">Go to Quiz</Link>
        </div>
      </GlassCard>

      <GlassCard className="p-6 mt-5">
        <div className="text-sm font-[600] text-ink mb-2">Manual add</div>
        <p className="text-[13px] text-ink-soft">Use “+ Add Question” in the Question Bank. Supports full HTML – paste College Board stem directly.</p>
      </GlassCard>
    </div>
  );
}
