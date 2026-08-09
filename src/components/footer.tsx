import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--line-soft)] py-8 px-4 text-center sm:px-6 md:px-8">
      <div className="mx-auto max-w-[1180px] flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="text-[13px] text-[var(--ink-faint)]">
          &copy; {new Date().getFullYear()} SAT Nexus. All rights reserved.
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4 text-[12.5px] font-medium text-[var(--ink-soft)]">
          <Link href="#" className="hover:text-[var(--accent)] transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-[var(--accent)] transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-[var(--accent)] transition-colors">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
