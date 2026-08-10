import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquarePlus, ShieldCheck, FileText, Bug, Lightbulb, BookOpenText } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — SAT Nexus",
  description: "Get in touch with the SAT Nexus team for support, feedback, and legal inquiries.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[820px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-faint)]">Support</p>
      <h1 className="font-display mt-1 text-[30px] font-bold text-[var(--ink)]">Contact Us</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--ink-soft)]">
        We read everything students send us. Pick the channel below that best matches what you need — the in-app
        feedback form is the fastest way to reach the team, and it automatically attaches helpful context (like the
        question you were viewing) so we can act on your report quickly.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] p-5">
          <div className="flex items-center gap-2.5">
            <Bug className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-[15px] font-bold text-[var(--ink)]">Report a problem</h2>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
            Found a broken question, a wrong answer key, a rendering glitch, or a bug anywhere on the site? Send a
            report with the feedback form and include the question ID if you have it.
          </p>
          <Link href="/feedback" className="btn btn-primary mt-4 !min-h-9 !px-4 !text-[13px]">
            <MessageSquarePlus className="h-4 w-4" /> Open the feedback form
          </Link>
        </div>

        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-[15px] font-bold text-[var(--ink)]">Suggest a feature</h2>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
            Have an idea that would make studying easier — a new game, a stat you want tracked, a tool you miss from
            another app? We prioritize the roadmap based on student suggestions.
          </p>
          <Link href="/feedback" className="btn btn-soft mt-4 !min-h-9 !px-4 !text-[13px]">
            <MessageSquarePlus className="h-4 w-4" /> Share an idea
          </Link>
        </div>

        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] p-5">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-[15px] font-bold text-[var(--ink)]">Privacy &amp; data requests</h2>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
            You can update your profile or permanently delete your account and synced data directly from Settings. For
            other privacy questions or data requests, send us a message marked &ldquo;Privacy&rdquo; via the feedback
            form and we will respond as required by applicable law.
          </p>
          <Link href="/privacy" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline">
            <FileText className="h-4 w-4" /> Read the Privacy Policy
          </Link>
        </div>

        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] p-5">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-[15px] font-bold text-[var(--ink)]">Legal &amp; copyright inquiries</h2>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
            Copyright takedown notices and counter-notifications must follow our DMCA procedure and go to our
            Designated Agent at{" "}
            <a href="mailto:dmca@sat-nexus.com" className="font-semibold text-[var(--accent)] hover:underline">
              dmca@sat-nexus.com
            </a>
            . For other legal notices, trademark questions, or arbitration opt-outs, contact us with the subject
            &ldquo;Legal&rdquo; via the feedback form.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            <Link href="/dmca" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline">
              <FileText className="h-4 w-4" /> DMCA Copyright Policy
            </Link>
            <Link href="/terms" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline">
              <FileText className="h-4 w-4" /> Terms of Service &amp; EULA
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[10px] border border-[var(--line-soft)] bg-[var(--paper-soft)] p-5">
        <div className="flex items-center gap-2.5">
          <BookOpenText className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-[15px] font-bold text-[var(--ink)]">A note on response times</h2>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">
          SAT Nexus is a small, student-focused project. We typically review reports within a few days, and
          question-content fixes are batched into regular updates. Thank you for helping us make the question bank
          better for everyone.
        </p>
      </div>
    </div>
  );
}
