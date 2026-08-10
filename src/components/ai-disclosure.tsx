import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FTC-compliant AI disclosure notice.
 *
 * Rendered adjacent to AI-assisted features (question explanations, study
 * hints, auto-graded practice feedback) so users are clearly informed when
 * content may be generated or enhanced by artificial intelligence models.
 */
export function AiDisclosure({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <p
      role="note"
      aria-label="AI content disclosure"
      className={cn(
        "flex items-start gap-1.5 text-[var(--ink-faint)]",
        compact ? "text-[10.5px] leading-snug" : "text-[11.5px] leading-relaxed",
        className,
      )}
    >
      <Sparkles className={cn("shrink-0", compact ? "mt-[1px] h-3 w-3" : "mt-0.5 h-3.5 w-3.5")} aria-hidden="true" />
      <span>
        <strong className="font-semibold">Notice:</strong> Question explanations and study hints may be generated or
        enhanced using artificial intelligence models. AI content can contain errors — verify important information
        independently.
      </span>
    </p>
  );
}
