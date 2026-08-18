"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn, type SoftTone } from "@/lib/utils";

export interface MultiOption {
  value: string;
  label: string;
  tone?: SoftTone;
}

/** Estimated menu height used to decide whether to flip the dropdown upward. */
const MENU_ESTIMATE = 320;

/**
 * Multi-select dropdown with a small check mark next to every chosen option.
 * "All"-style options (value "All") reset the selection back to none when picked.
 *
 * The popover is rendered through a React portal so it is never clipped by an
 * `overflow: hidden` parent (e.g. `GlassCard`) nor hidden behind later content
 * that would otherwise win the stacking order. It is positioned under the
 * trigger (flipping upward when there is no room below) and repositioned on
 * scroll; resizing the window simply closes it.
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
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number; up: boolean } | null>(null);

  const computePos = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuHeight = Math.min(MENU_ESTIMATE, Math.max(120, options.length * 42 + 12));
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const up = spaceBelow < menuHeight && spaceAbove >= Math.min(menuHeight, spaceBelow);
    setPos({
      top: up ? rect.top - 8 : rect.bottom + 6,
      left: Math.max(6, Math.min(rect.left, window.innerWidth - rect.width - 6)),
      width: rect.width,
      up,
    });
  }, [options.length]);

  React.useEffect(() => {
    if (!open) return;
    computePos();
    const onScroll = () => computePos();
    const onResize = () => setOpen(false);
    // The menu is portaled to document.body, so it is not a descendant of
    // rootRef. Ignore pointerdowns that land in the menu — otherwise the
    // dismiss handler unmounts the list before the option's click can fire.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, computePos]);

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
    // Stay open while multi-selecting; only "All" clears and leaves the menu open
    // so the user can confirm the empty state, then click outside to dismiss.
    if (value === "All") {
      onValuesChange([]);
      return;
    }
    onValuesChange(
      selectedSet.has(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
  };

  const menu = (
    <div
      ref={menuRef}
      className={cn(
        "paper-pop fixed z-[999] overflow-hidden rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-[0_16px_36px_rgba(20,24,34,0.18)]",
      )}
      style={{
        top: pos?.top,
        left: pos?.left,
        width: pos?.width,
        transform: pos?.up ? "translateY(-100%)" : undefined,
      }}
      role="listbox"
      aria-multiselectable="true"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="max-h-[300px] overflow-y-auto p-1.5 scrollbar-thin">
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
              data-state={active ? "checked" : undefined}
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
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-tone={tone}
        data-state={open ? "open" : "closed"}
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) computePos();
            return next;
          });
        }}
        className={cn(
          "paper-select-trigger group inline-flex w-full items-center justify-between gap-2 rounded-[7px] border border-[var(--line)] bg-[var(--control-bg,var(--paper-raised))] text-left text-[var(--ink)] transition-[background-color,border-color,box-shadow] duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 data-[state=open]:ring-2 data-[state=open]:ring-[var(--accent)]/20",
          "disabled:cursor-not-allowed disabled:opacity-45",
          size === "md" ? "px-3.5 py-2.5 text-sm" : "rounded-[5px] px-2.5 py-1.5 text-[13px]",
        )}
      >
        <span className={cn("truncate", values.length === 0 && "text-[var(--ink-faint)]")}>{triggerLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-65 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && pos && createPortal(menu, document.body)}
    </div>
  );
}

export default PaperMultiSelect;
