"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn, type SoftTone } from "@/lib/utils";

export interface MultiOption {
  value: string;
  label: string;
  tone?: SoftTone;
}

/**
 * Multi-select dropdown with a small check mark next to every chosen option.
 * "All"-style options (value "All") reset the selection back to none when picked.
 */
export function PaperMultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = "All",
  className,
  disabled,
  size = "md",
  ariaLabel,
  tone = "paper",
  showAllOption = true,
  allLabel = "All",
}: {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: MultiOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
  tone?: SoftTone;
  showAllOption?: boolean;
  allLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectedSet = React.useMemo(() => new Set(values), [values]);
  const visibleOptions = showAllOption
    ? [{ value: "All", label: allLabel, tone }, ...options]
    : options;

  const triggerLabel = React.useMemo(() => {
    if (values.length === 0) return placeholder;
    if (values.length === options.length) return "All";
    return values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");
  }, [values, options, placeholder]);

  const toggle = (value: string) => {
    if (value === "All") {
      onValuesChange([]);
      setOpen(false);
      return;
    }
    setOpen(false);
    onValuesChange(
      selectedSet.has(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-tone={tone}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "paper-select-trigger group inline-flex w-full items-center justify-between gap-2 rounded-[7px] border text-left transition-[background-color,border-color,box-shadow] duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 data-[state=open]:ring-2 data-[state=open]:ring-[var(--accent)]/20",
          "disabled:cursor-not-allowed disabled:opacity-45",
          size === "md" ? "px-3.5 py-2.5 text-sm" : "rounded-[5px] px-2.5 py-1.5 text-[13px]",
        )}
      >
        <span className={cn("truncate", values.length === 0 && "text-[var(--ink-faint)]")}>{triggerLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-65 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div className="paper-pop absolute left-0 right-0 z-[999] mt-1.5 overflow-hidden rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-[0_16px_36px_rgba(20,24,34,0.18)]">
          <div className="max-h-[300px] overflow-y-auto p-1.5 scrollbar-thin" role="listbox" aria-multiselectable="true">
            {visibleOptions.map((option) => {
              const isAll = option.value === "All";
              const active = isAll ? values.length === 0 : selectedSet.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-tone={option.tone ?? tone}
                  onClick={() => toggle(option.value)}
                  className={cn(
                    "paper-select-item flex w-full cursor-pointer select-none items-center gap-2 rounded-[5px] py-2 pl-3 pr-2 text-left text-[13.5px] outline-none transition-colors",
                    "hover:bg-[var(--paper-soft)]",
                    active && "font-semibold",
                    size === "sm" && "py-1.5 text-[12.5px]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                      active ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-[var(--paper-raised)]",
                    )}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default PaperMultiSelect;
