"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

/** Accessible paper-theme slider with tick marks and a value bubble. */
export function PaperSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled,
  showBubble = true,
  formatValue = (v: number) => String(v),
  ticks,
  ariaLabel,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  showBubble?: boolean;
  formatValue?: (v: number) => string;
  /** render small tick marks */
  ticks?: number[];
  ariaLabel?: string;
}) {
  const [dragging, setDragging] = React.useState(false);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative w-full pt-1", className)}>
      <SliderPrimitive.Root
        className={cn(
          "relative flex h-6 w-full touch-none select-none items-center",
          disabled && "opacity-50 pointer-events-none",
        )}
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel ?? "slider"}
      >
        <SliderPrimitive.Track className="relative h-[10px] grow overflow-hidden rounded-full border border-[var(--line)] bg-[var(--paper-deep)] shadow-[inset_0_1px_3px_rgba(20,24,34,0.12)]">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-[var(--accent)]" />
        </SliderPrimitive.Track>

        {/* tick marks */}
        {ticks && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex h-full -translate-y-1/2 items-center justify-between px-[10px]">
            {ticks.map((t) => (
              <span
                key={t}
                className={cn(
                  "h-[4px] w-[2px] rounded-full",
                  ((t - min) / (max - min)) * 100 <= pct ? "bg-white/70" : "bg-[var(--ink-faint)]/50",
                )}
              />
            ))}
          </div>
        )}

        <SliderPrimitive.Thumb
          className={cn(
            "relative block h-[22px] w-[22px] cursor-grab rounded-full border-[2.5px] border-[var(--accent)] bg-[var(--paper-raised)]",
            "shadow-md",
            "focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/20",
            "active:cursor-grabbing",
          )}
        >
          <span className="absolute inset-[5px] rounded-full bg-[var(--accent)]" />
          {showBubble && (
            <span
              className={cn(
                "pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[5px] border border-[var(--line)] bg-[var(--paper-raised)] px-2.5 py-1 text-[12px] font-bold text-[var(--accent)] shadow-[0_4px_12px_rgba(60,45,20,0.12)] transition-all duration-150",
                dragging ? "opacity-100" : "opacity-0",
              )}
            >
              {formatValue(value)}
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#fffdf8]" />
            </span>
          )}
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>

      {/* min/max labels */}
      <div className="mt-1 flex justify-between text-[10.5px] font-medium tracking-wide text-[var(--ink-faint)]">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

export default PaperSlider;
