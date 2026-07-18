"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

/**
 * Soft Paper slider — buttery Radix slider with gradient fill, paper thumb,
 * optional tick marks and a floating value bubble.
 */
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
        <SliderPrimitive.Track className="relative h-[10px] grow overflow-hidden rounded-full border border-[#ddd5c2] bg-[#eee8d8] shadow-[inset_0_1px_3px_rgba(60,45,20,0.10)]">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-[#7aa5f2] via-[#5b8def] to-[#3a5fc8] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" />
        </SliderPrimitive.Track>

        {/* tick marks */}
        {ticks && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex h-full -translate-y-1/2 items-center justify-between px-[10px]">
            {ticks.map((t) => (
              <span
                key={t}
                className={cn(
                  "h-[4px] w-[2px] rounded-full",
                  ((t - min) / (max - min)) * 100 <= pct ? "bg-white/70" : "bg-[#cfc6b0]",
                )}
              />
            ))}
          </div>
        )}

        <SliderPrimitive.Thumb
          className={cn(
            "relative block h-[22px] w-[22px] cursor-grab rounded-full border-[2.5px] border-[#3a5fc8] bg-white",
            "shadow-[0_2px_6px_rgba(58,95,200,0.35),0_1px_2px_rgba(60,45,20,0.15)]",
            "transition-transform duration-150 hover:scale-110 focus:outline-none focus:shadow-[0_0_0_4px_rgba(91,141,239,0.25)]",
            "active:cursor-grabbing active:scale-105",
          )}
        >
          <span className="absolute inset-[5px] rounded-full bg-gradient-to-br from-[#7aa5f2] to-[#3a5fc8]" />
          {showBubble && (
            <span
              className={cn(
                "pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#e2dbc9] bg-[#fffdf8] px-2.5 py-1 text-[12px] font-bold text-[#3053ad] shadow-[0_4px_12px_rgba(60,45,20,0.12)] transition-all duration-150",
                dragging ? "opacity-100 -translate-y-0.5 scale-100" : "opacity-0 translate-y-1 scale-90",
              )}
            >
              {formatValue(value)}
              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#fffdf8]" />
            </span>
          )}
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>

      {/* min/max labels */}
      <div className="mt-1 flex justify-between text-[10.5px] font-medium tracking-wide text-[#8a8680]">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

export default PaperSlider;
