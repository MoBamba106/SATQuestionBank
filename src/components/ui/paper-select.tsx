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

const triggerTones: Record<SoftTone, string> = {
  paper: "border-[#cac1b9] bg-[#f8f2eb] text-[#575279]",
  blue: "border-[#acc7d0] bg-[#dce8ed] text-[#245d73]",
  teal: "border-[#b3cccf] bg-[#deeaeb] text-[#4d7c83]",
  green: "border-[#b5cdbd] bg-[#dfece3] text-[#477b5c]",
  yellow: "border-[#d9bd91] bg-[#f1e4cf] text-[#8b622f]",
  peach: "border-[#dfb6a9] bg-[#f3dfd7] text-[#9c5949]",
  rose: "border-[#d2abb7] bg-[#f0dfe5] text-[#8e5264]",
  pink: "border-[#dab1ca] bg-[#f1ddea] text-[#965378]",
  lavender: "border-[#c9b9d1] bg-[#e9e1ec] text-[#6e5d7b]",
};

const optionTones: Record<SoftTone, string> = {
  paper: "data-[state=checked]:bg-[#e6dbd1] data-[state=checked]:text-[#575279]",
  blue: "data-[state=checked]:bg-[#dce8ed] data-[state=checked]:text-[#245d73]",
  teal: "data-[state=checked]:bg-[#deeaeb] data-[state=checked]:text-[#4d7c83]",
  green: "data-[state=checked]:bg-[#dfece3] data-[state=checked]:text-[#477b5c]",
  yellow: "data-[state=checked]:bg-[#f1e4cf] data-[state=checked]:text-[#8b622f]",
  peach: "data-[state=checked]:bg-[#f3dfd7] data-[state=checked]:text-[#9c5949]",
  rose: "data-[state=checked]:bg-[#f0dfe5] data-[state=checked]:text-[#8e5264]",
  pink: "data-[state=checked]:bg-[#f1ddea] data-[state=checked]:text-[#965378]",
  lavender: "data-[state=checked]:bg-[#e9e1ec] data-[state=checked]:text-[#6e5d7b]",
};

/** A Radix select using Soft Paper's muted section colors. */
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
        className={cn(
          "group inline-flex w-full items-center justify-between gap-2 rounded-[7px] border bg-[var(--paper-raised)] text-left shadow-[0_1px_2px_rgba(87,82,121,0.05)] transition-colors duration-150",
          triggerTones[tone],
          "hover:brightness-[0.985] focus:outline-none focus:ring-2 focus:ring-[#286983]/20",
          "data-[state=open]:ring-2 data-[state=open]:ring-[#286983]/20",
          "disabled:cursor-not-allowed disabled:opacity-45",
          size === "md" ? "px-3.5 py-2.5 text-sm" : "rounded-[5px] px-2.5 py-1.5 text-[13px]",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={<span className="text-[var(--ink-faint)]">{placeholder}</span>} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70 transition-transform duration-150 group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="paper-pop z-[999] max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_16px_36px_rgba(87,82,121,0.16)]"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center bg-[var(--paper-raised)] text-[var(--ink-faint)]">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1.5 scrollbar-thin">
            {options.map((option) => {
              const optionTone = option.tone ?? tone;
              return (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center gap-2 rounded-[5px] py-2 pl-3 pr-8 text-[13.5px] text-[var(--ink)] outline-none transition-colors",
                    "data-[highlighted]:bg-[var(--paper-soft)] data-[state=checked]:font-semibold",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                    optionTones[optionTone],
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
                    <Check className="h-4 w-4 text-current" strokeWidth={3} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              );
            })}
            {options.length === 0 && (
              <div className="px-3 py-4 text-center text-[13px] text-[var(--ink-faint)]">No options</div>
            )}
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
