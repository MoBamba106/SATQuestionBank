import Link from 'next/link';
import { Ghost, ArrowLeft } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <GlassCard hover={false} className="max-w-md p-8 text-center">
        <Ghost className="mx-auto mb-4 h-12 w-12 text-[var(--accent)]" />
        <h1 className="font-display text-4xl font-bold text-[var(--ink)]">404</h1>
        <p className="mt-2 text-[15px] font-medium text-[var(--ink-soft)]">Page not found</p>
        <p className="mt-2 text-[13.5px] text-[var(--ink-faint)]">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="btn btn-primary mt-6 inline-flex w-full justify-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Study Desk
        </Link>
      </GlassCard>
    </div>
  );
}
