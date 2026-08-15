import Link from 'next/link';
import { Sparkles } from 'lucide-react';

const APP_NAME = 'SAT Nexus';

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms & EULA' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/dmca', label: 'DMCA Notice' },
  { href: '/contact', label: 'Contact & Legal' },
];

/**
 * Compact site footer.
 *
 * Everything sits on a single row on desktop (copyright · AI disclosure ·
 * legal nav) and wraps to a tight stack on mobile. Same content as before,
 * roughly a third of the height.
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line-soft)] px-4 py-3 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-x-4 gap-y-1.5 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-[var(--ink-faint)] md:justify-start">
          <span>
            &copy; {new Date().getFullYear()} {APP_NAME}
          </span>
          <span aria-hidden="true" className="hidden text-[var(--line)] sm:inline">
            ·
          </span>
          <span
            role="note"
            aria-label="AI content disclosure"
            className="inline-flex items-center gap-1 text-[11px] leading-snug"
          >
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
            Explanations may be AI-generated or AI-enhanced.
          </span>
        </div>
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[12px] font-medium text-[var(--ink-soft)]"
        >
          {LEGAL_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="transition-colors hover:text-[var(--accent)]">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
