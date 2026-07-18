"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Fully custom, themeable dropdown (Radix under the hood) styled for the
 * Soft Paper theme. Zero native <select> elements anywhere in the app.
 */
export function PaperSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
  size = "md",
  ariaLabel,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          "group inline-flex w-full items-center justify-between gap-2 rounded-xl border-[1.5px] border-[#d5cfc0] bg-white text-left text-[#2b2b2a] shadow-[0_1px_3px_rgba(60,45,20,0.05)] transition-all duration-150",
          "hover:border-[#c0b8a2] hover:shadow-[0_2px_8px_rgba(60,45,20,0.08)]",
          "focus:outline-none focus:border-[#5b8def] focus:shadow-[0_0_0_3px_rgba(91,141,239,0.15)]",
          "data-[state=open]:border-[#5b8def] data-[state=open]:shadow-[0_0_0_3px_rgba(91,141,239,0.15)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          size === "md" ? "px-3.5 py-2.5 text-sm" : "px-2.5 py-1.5 text-[13px] rounded-lg",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={<span className="text-[#8a8680]">{placeholder}</span>} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#8a8680] transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-[#3a5fc8]" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "paper-pop z-[999] max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[#e2dbc9] bg-[#fffdf8]",
            "shadow-[0_16px_40px_rgba(60,45,20,0.16),0_2px_8px_rgba(60,45,20,0.08)]",
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center bg-[#fffdf8] text-[#8a8680]">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1.5 scrollbar-thin">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-3 pr-8 text-[13.5px] text-[#2b2b2a] outline-none transition-colors",
                  "data-[highlighted]:bg-[#f2ecdd] data-[highlighted]:text-[#1f1e1c]",
                  "data-[state=checked]:bg-[#e9effc] data-[state=checked]:text-[#3053ad] data-[state=checked]:font-semibold",
                  "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none",
                  size === "sm" && "py-1.5 text-[12.5px]",
                )}
              >
                <SelectPrimitive.ItemText>
                  <span className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.hint && <span className="text-[11px] text-[#8a8680]">{opt.hint}</span>}
                  </span>
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center">
                  <Check className="h-4 w-4 text-[#3a5fc8]" strokeWidth={3} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-4 text-center text-[13px] text-[#8a8680]">No options</div>
            )}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center bg-[#fffdf8] text-[#8a8680]">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export default PaperSelect;
