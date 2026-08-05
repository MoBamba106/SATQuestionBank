"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  BookOpenText,
  CalendarClock,
  Folders,
  LayoutDashboard,
  Library,
  MonitorSmartphone,
  PenSquare,
  RotateCcw,
  Search,
  Cog,
  Trophy,
  MessageSquarePlus,
  X,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  keywords?: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: () => void;
};

const BASE_NAV_COMMANDS: CommandItem[] = [
  { id: "home", label: "Study desk", href: "/", icon: LayoutDashboard, keywords: "home dashboard" },
  { id: "study", label: "Study library", href: "/study", icon: BookMarked, keywords: "vocab flashcards" },
  { id: "quiz", label: "Practice quiz", href: "/quiz", icon: PenSquare, keywords: "practice exam" },
  { id: "bank", label: "Question bank", href: "/bank", icon: Library, keywords: "questions search" },
  { id: "bluebook", label: "Practice tests", href: "/bluebook", icon: MonitorSmartphone, keywords: "bluebook sat test" },
  { id: "collections", label: "Collections", href: "/collections", icon: Folders, keywords: "folders save" },
  { id: "mistakes", label: "Mistake bank", href: "/mistakes", icon: RotateCcw, keywords: "wrong review" },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3, keywords: "stats progress" },
  { id: "sessions", label: "Study sessions", href: "/study-sessions", icon: CalendarClock, keywords: "history" },
  { id: "leaderboard", label: "Leaderboard", href: "/leaderboard", icon: Trophy, keywords: "rank top compare accuracy" },
  { id: "shared", label: "Shared questions", href: "/shared", icon: Share2, keywords: "shared sent received collaboration" },
];

const ADMIN_COMMAND: CommandItem = {
  id: "admin",
  label: "Admin console",
  href: "/admin",
  icon: ShieldCheck,
  keywords: "admin users oversight",
};

const FEEDBACK_COMMAND: CommandItem = {
  id: "feedback",
  label: "Feedback",
  href: "/feedback",
  icon: MessageSquarePlus,
  keywords: "complaint improvement suggest bug report",
};

export function CommandPalette({
  open,
  onOpenChange,
  onOpenSettings,
  extra = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
  extra?: CommandItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const auth = useAuth();
  const items = React.useMemo(() => {
    const nav = [
      ...BASE_NAV_COMMANDS,
      ...(auth.isAdmin ? [ADMIN_COMMAND] : []),
      FEEDBACK_COMMAND,
    ];
    const all: CommandItem[] = [
      ...nav,
      ...(onOpenSettings
        ? [{ id: "settings", label: "Settings", icon: Cog, keywords: "preferences theme", action: onOpenSettings } as CommandItem]
        : []),
      ...extra,
    ];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) =>
      `${item.label} ${item.hint ?? ""} ${item.keywords ?? ""} ${item.href ?? ""}`.toLowerCase().includes(q),
    );
  }, [auth.isAdmin, extra, onOpenSettings, query]);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(t);
  }, [open]);

  const run = React.useCallback(
    (item: CommandItem) => {
      onOpenChange(false);
      if (item.action) item.action();
      else if (item.href) router.push(item.href);
    },
    [onOpenChange, router],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Navigate"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[0_28px_80px_rgba(0,0,0,.45)]">
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onOpenChange(false);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => Math.min(items.length - 1, i + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (event.key === "Enter" && items[active]) {
                event.preventDefault();
                run(items[active]);
              }
            }}
            placeholder="Go to a page… (/ or Ctrl+K)"
            className="h-12 w-full bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
          />
          <button
            type="button"
            className="rounded-[5px] p-1.5 text-[var(--ink-faint)] hover:bg-[var(--paper-soft)]"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-[13px] text-[var(--ink-faint)]">No matches</li>
          )}
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => run(item)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left transition-colors",
                  index === active ? "bg-[var(--accent-soft)] text-[var(--ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--paper-soft)]",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 grow">
                  <span className="block text-[14px] font-semibold">{item.label}</span>
                  {(item.hint || item.href) && (
                    <span className="block truncate text-[11.5px] text-[var(--ink-faint)]">{item.hint || item.href}</span>
                  )}
                </span>
                {index === active && (
                  <kbd className="rounded border border-[var(--line)] bg-[var(--paper-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-faint)]">
                    ↵
                  </kbd>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-[10.5px] text-[var(--ink-faint)]">
          <BookOpenText className="h-3.5 w-3.5" />
          <span>↑↓ move · Enter open · Esc close · / or Ctrl+K toggle</span>
        </div>
      </div>
    </div>
  );
}

/** Global listener that opens the palette on `/` or Ctrl/Cmd+K. */
export function useCommandPaletteHotkey(setOpen: (open: boolean | ((v: boolean) => boolean)) => void) {
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      const isModK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      const isSlash = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey;

      if (isModK) {
        event.preventDefault();
        setOpen((open) => !open);
        return;
      }
      if (isSlash && !editable) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
