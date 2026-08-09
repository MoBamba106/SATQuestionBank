"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <GlassCard hover={false} className="max-w-md p-8 text-center border-[#f3ccd4] bg-[#fdf0f2]">
        <AlertOctagon className="mx-auto mb-4 h-12 w-12 text-[#a33046]" />
        <h1 className="font-display text-2xl font-bold text-[#a33046]">Something went wrong!</h1>
        <p className="mt-2 text-[13.5px] text-[#ae3d51] opacity-90">
          An unexpected error occurred. Our team has been notified.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => reset()}
            className="btn w-full justify-center bg-white text-[#a33046] border border-[#f3ccd4] hover:bg-[#fae7ea]"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </button>
          <Link href="/" className="btn btn-primary w-full justify-center">
            <Home className="mr-2 h-4 w-4" />
            Go home
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
