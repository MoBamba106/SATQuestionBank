"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn, type SoftTone } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  tone?: SoftTone;
}

/** Radix select whose material and accent are controlled by the active theme. */
export function PaperSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
  size = "md",
  ariaLabel,
  tone = "paper",
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
  tone?: SoftTone;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel ?? placeholder}
        data-tone={tone}
        className={cn(
          "paper-select-trigger group inline-flex w-full items-center justify-between gap-2 rounded-[7px] border text-left transition-[background-color,border-color,box-shadow] duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 data-[state=open]:ring-2 data-[state=open]:ring-[var(--accent)]/20",
          "disabled:cursor-not-allowed disabled:opacity-45",
          size === "md" ? "px-3.5 py-2.5 text-sm" : "rounded-[5px] px-2.5 py-1.5 text-[13px]",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={<span className="text-[var(--ink-faint)]">{placeholder}</span>} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-65 transition-transform duration-150 group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="paper-pop z-[999] max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-[0_16px_36px_rgba(20,24,34,0.18)]"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center bg-[var(--paper-raised)] text-[var(--ink-faint)]">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1.5 scrollbar-thin">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                data-tone={option.tone ?? tone}
                className={cn(
                  "paper-select-item relative flex cursor-pointer select-none items-center gap-2 rounded-[5px] py-2 pl-3 pr-8 text-[13.5px] outline-none transition-colors",
                  "data-[highlighted]:bg-[var(--paper-soft)] data-[state=checked]:font-semibold",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                  size === "sm" && "py-1.5 text-[12.5px]",
                )}
              >
                <SelectPrimitive.ItemText>
                  <span className="flex flex-col">
                    <span>{option.label}</span>
                    {option.hint && <span className="text-[11px] text-[var(--ink-faint)]">{option.hint}</span>}
                  </span>
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center">
                  <Check className="h-4 w-4 text-[var(--accent)]" strokeWidth={3} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
            {options.length === 0 && <div className="px-3 py-4 text-center text-[13px] text-[var(--ink-faint)]">No options</div>}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center bg-[var(--paper-raised)] text-[var(--ink-faint)]">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export default PaperSelect;
