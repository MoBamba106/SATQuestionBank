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
    const menuHeight = Math.min(MENU_ESTIMATE, Math.max(120, options.length * 42 + 42));
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

  // Use layout effect so position is computed synchronously before paint when opening.
  // This avoids the double-render flash where open=true but pos=null hid the menu.
  React.useLayoutEffect(() => {
    if (open) computePos();
  }, [open, computePos]);

  React.useEffect(() => {
    if (!open) return;
    // Recompute on scroll (capture phase so we catch scrolls inside any container)
    const onScroll = () => computePos();
    const onResize = () => setOpen(false);

    const isInside = (target: Node | null) => {
      if (!target) return false;
      // composedPath handles shadow DOM / portal cases more reliably than contains alone
      const path = (target as unknown as { composedPath?: () => EventTarget[] })?.composedPath?.()
        ? ((target as unknown as { composedPath: () => EventTarget[] }).composedPath() as unknown as Node[])
        : [];
      if (path.length) {
        return path.some((node) => rootRef.current?.contains(node) || menuRef.current?.contains(node));
      }
      return Boolean(rootRef.current?.contains(target) || menuRef.current?.contains(target));
    };

    const onPointerDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node | null;
      if (isInside(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    // Listen to both pointerdown and mousedown for maximum compatibility (some
    // browsers / assistive tech still fire mousedown without pointerdown).
    document.addEventListener("pointerdown", onPointerDown as unknown as EventListener);
    document.addEventListener("mousedown", onPointerDown as unknown as EventListener);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onPointerDown as unknown as EventListener);
      document.removeEventListener("mousedown", onPointerDown as unknown as EventListener);
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

  const toggle = React.useCallback(
    (value: string) => {
      if (value === "All") {
        onValuesChange([]);
        return;
      }
      onValuesChange(
        selectedSet.has(value)
          ? values.filter((v) => v !== value)
          : [...values, value],
      );
    },
    [onValuesChange, selectedSet, values],
  );

  const handleTriggerClick = React.useCallback(() => {
    if (disabled) return;
    // Compute position synchronously before opening so the menu can appear on the
    // very first render with open=true (no flash where open && !pos hides it).
    if (!open) computePos();
    setOpen((o) => !o);
  }, [disabled, open, computePos]);

  const menu = (
    <div
      ref={menuRef}
      className={cn(
        "paper-pop fixed z-[999] overflow-hidden rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-[0_16px_36px_rgba(20,24,34,0.18)]",
      )}
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        width: pos?.width,
        transform: pos?.up ? "translateY(-100%)" : undefined,
        // While pos is null (first frame after opening) keep the menu invisible
        // but mounted so refs are set and outside-click detection works.
        opacity: pos ? 1 : 0,
        pointerEvents: pos ? "auto" : "none",
      }}
      role="listbox"
      aria-multiselectable="true"
      // Prevent the document's pointerdown/mousedown outside handler from
      // seeing inside clicks as outside. Stop both the React synthetic event
      // and the native event's immediate propagation for robustness across
      // React's portal delegation (where stopPropagation alone may not prevent
      // a document-level listener at the same node).
      onPointerDown={(event) => {
        event.stopPropagation();
        // Also stop native propagation for listeners at the same document node.
        (event.nativeEvent as unknown as { stopImmediatePropagation?: () => void })?.stopImmediatePropagation?.();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        (event.nativeEvent as unknown as { stopImmediatePropagation?: () => void })?.stopImmediatePropagation?.();
      }}
      onClick={(event) => event.stopPropagation()}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(option.value);
              }}
              // Also handle mousedown to ensure selection works even if click is
              // somehow swallowed by the outside-click handler's timing.
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
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
        onClick={handleTriggerClick}
        onPointerDown={(e) => {
          // Prevent the document's outside handler (which listens on pointerdown)
          // from closing the menu immediately when the trigger itself is clicked.
          // We stop propagation at the trigger so the outside handler sees it as inside.
          if (open) {
            // When closing via trigger, let the click toggle handle it; just keep
            // the event from being treated as an outside click.
            e.stopPropagation();
          }
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

      {open && typeof document !== "undefined" && createPortal(menu, document.body)}
    </div>
  );
}

export default PaperMultiSelect;
