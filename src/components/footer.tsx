import Link from 'next/link';
import { Sparkles } from 'lucide-react';

const APP_NAME = 'SAT Nexus';

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms & EULA' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/dmca', label: 'DMCA Notice' },
  { href: '/contact', label: 'Contact & Legal' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line-soft)] py-8 px-4 text-center sm:px-6 md:px-8">
      <div className="mx-auto max-w-[1180px] flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-[13px] text-[var(--ink-faint)]">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-4 text-[12.5px] font-medium text-[var(--ink-soft)]">
          {LEGAL_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-[var(--accent)] transition-colors">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <p
        role="note"
        aria-label="AI content disclosure"
        className="mx-auto mt-4 flex max-w-[1180px] items-center justify-center gap-1.5 text-[11px] leading-relaxed text-[var(--ink-faint)] md:justify-start"
      >
        <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
        Notice: Question explanations and study hints may be generated or enhanced using artificial intelligence models.
      </p>
    </footer>
  );
}
