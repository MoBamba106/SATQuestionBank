"use client";

import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  FlaskConical,
  Folder,
  GraduationCap,
  Languages,
  Lightbulb,
  PenTool,
  Star,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const COLLECTION_ICONS = [
  { id: "folder", label: "Folder", icon: Folder, tone: "soft-tone-blue" },
  { id: "book", label: "Book", icon: BookOpen, tone: "soft-tone-lavender" },
  { id: "calculator", label: "Calculator", icon: Calculator, tone: "soft-tone-teal" },
  { id: "language", label: "Language", icon: Languages, tone: "soft-tone-pink" },
  { id: "target", label: "Target", icon: Target, tone: "soft-tone-rose" },
  { id: "brain", label: "Brain", icon: Brain, tone: "soft-tone-lavender" },
  { id: "science", label: "Science", icon: FlaskConical, tone: "soft-tone-green" },
  { id: "atom", label: "Concepts", icon: Atom, tone: "soft-tone-blue" },
  { id: "idea", label: "Idea", icon: Lightbulb, tone: "soft-tone-yellow" },
  { id: "writing", label: "Writing", icon: PenTool, tone: "soft-tone-peach" },
  { id: "school", label: "School", icon: GraduationCap, tone: "soft-tone-teal" },
  { id: "star", label: "Star", icon: Star, tone: "soft-tone-yellow" },
] as const;

export type CollectionIconId = (typeof COLLECTION_ICONS)[number]["id"];

export function CollectionIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const choice = COLLECTION_ICONS.find((item) => item.id === icon) ?? COLLECTION_ICONS[0];
  const Icon = choice.icon;
  return (
    <span className={cn("soft-tone flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px]", choice.tone, className)}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

export function CollectionIconPicker({ value, onChange }: { value: string; onChange: (icon: CollectionIconId) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12" role="radiogroup" aria-label="Collection icon">
      {COLLECTION_ICONS.map((choice) => {
        const Icon = choice.icon;
        const active = value === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={choice.label}
            title={choice.label}
            onClick={() => onChange(choice.id)}
            className={cn(
              "soft-tone flex aspect-square items-center justify-center rounded-[7px] transition-colors",
              choice.tone,
              active ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--paper-raised)]" : "opacity-70 hover:opacity-100",
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </button>
        );
      })}
    </div>
  );
}
