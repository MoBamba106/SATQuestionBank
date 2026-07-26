"use client";

import * as React from "react";
import {
  Accessibility,
  Check,
  Clock3,
  Database,
  Eye,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { PaperSelect } from "@/components/ui/paper-select";
import { apiDelete, mutateKey } from "@/lib/api-client";
import {
  type AppTheme,
  type FontScale,
  type QuizModeSetting,
  useSettings,
} from "@/components/settings-provider";
import { cn } from "@/lib/utils";
import { clearAllBluebookProgress } from "@/lib/bluebook-cache";

const THEMES: {
  id: AppTheme;
  name: string;
  description: string;
  swatches: string[];
}[] = [
  { id: "light", name: "Light", description: "Crisp white and navy", swatches: ["#f7f9fc", "#2346a0", "#19a7e0", "#172033"] },
  { id: "dark", name: "Dark", description: "Deep slate and cyan", swatches: ["#0d1726", "#172638", "#31b7e8", "#e8eef5"] },
  { id: "obsidian", name: "Obsidian", description: "Matte black and amethyst", swatches: ["#08090d", "#171821", "#5a42e8", "#23744a"] },
  { id: "highlighter", name: "Highlighter", description: "Pastel study markers", swatches: ["#fff9df", "#f3b4b8", "#94c8e8", "#b8d2ad"] },
  { id: "liquid-glass", name: "Liquid Glass", description: "Translucent Apple-style depth", swatches: ["#dcecff", "#ffffffaa", "#6699ff", "#9e7bff"] },
  { id: "soft-paper", name: "Soft Paper", description: "Warm tactile notebook", swatches: ["#eee6dd", "#69d8cf", "#d19548", "#8a3d18"] },
];

function Toggle({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--paper-soft)]"
    >
      <Icon className="h-4.5 w-4.5 shrink-0 text-[var(--accent)]" />
      <span className="min-w-0 grow">
        <span className="block text-[13.5px] font-semibold text-[var(--ink)]">{label}</span>
        <span className="block text-[11.5px] leading-snug text-[var(--ink-faint)]">{description}</span>
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-[var(--accent)]" : "bg-[var(--paper-deep)]")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-[left]", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [clearing, setClearing] = React.useState<"progress" | "all" | null>(null);
  const [confirm, setConfirm] = React.useState<"progress" | "all" | null>(null);

  const clearData = async (scope: "progress" | "all") => {
    if (confirm !== scope) {
      setConfirm(scope);
      return;
    }
    setClearing(scope);
    try {
      await apiDelete(`/api/user-data?scope=${scope}`);
      mutateKey("stats");
      mutateKey("mistakes");
      mutateKey("favorites");
      mutateKey("collections");
      if (scope === "all") {
        resetSettings();
        window.localStorage.removeItem("sat-nexus-study-mastered");
        clearAllBluebookProgress();
        window.sessionStorage.clear();
      }
      toast.success(scope === "all" ? "All personal data erased" : "Practice history cleared");
      setConfirm(null);
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not erase data", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setClearing(null);
    }
  };

  return (
    <PaperDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirm(null);
        onOpenChange(next);
      }}
      wide
      title={
        <span className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-[var(--accent)]" /> Settings
        </span>
      }
      description="Appearance, accessibility, practice defaults, and privacy controls."
    >
      <div className="mt-5 max-h-[70vh] space-y-7 overflow-y-auto pr-1 scrollbar-thin">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-[var(--sp-lavender)]" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Theme</h2>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((theme) => {
              const active = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => updateSettings({ theme: theme.id })}
                  className={cn(
                    "relative rounded-[8px] border p-3 text-left transition-colors",
                    active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--paper-raised)] hover:bg-[var(--paper-soft)]",
                  )}
                >
                  {active && <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--accent)]" strokeWidth={3} />}
                  <span className="text-[13.5px] font-bold text-[var(--ink)]">{theme.name}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--ink-faint)]">{theme.description}</span>
                  <span className="mt-3 flex gap-1.5">
                    {theme.swatches.map((color) => <span key={color} className="h-5 w-5 rounded-[5px] border border-black/10" style={{ background: color }} />)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Accessibility className="h-4 w-4 text-[var(--sp-green)]" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Accessibility & layout</h2>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] p-3.5">
              <label className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink)]">
                <Type className="h-4 w-4 text-[var(--accent)]" /> Text size
              </label>
              <PaperSelect
                tone="lavender"
                value={settings.fontScale}
                onValueChange={(value) => updateSettings({ fontScale: value as FontScale })}
                options={[
                  { value: "small", label: "Small", tone: "paper" },
                  { value: "default", label: "Default", tone: "lavender" },
                  { value: "large", label: "Large", tone: "green" },
                ]}
              />
            </div>
            <Toggle checked={settings.reducedMotion} onChange={(reducedMotion) => updateSettings({ reducedMotion })} label="Reduce motion" description="Stops decorative motion and follows accessibility guidance." icon={RotateCcw} />
            <Toggle checked={settings.compactMode} onChange={(compactMode) => updateSettings({ compactMode })} label="Compact layout" description="Fits more questions and controls on screen." icon={LayoutGrid} />
            <Toggle checked={settings.showTimer} onChange={(showTimer) => updateSettings({ showTimer })} label="Show practice timers" description="Hide elapsed time during ordinary quizzes to reduce pressure." icon={Clock3} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--sp-blue)]" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Practice defaults</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold text-[var(--ink-soft)]">Default quiz length</label>
              <PaperSelect
                tone="blue"
                value={String(settings.defaultQuizSize)}
                onValueChange={(value) => updateSettings({ defaultQuizSize: Number(value) })}
                options={[5, 10, 15, 20, 30, 40].map((value) => ({ value: String(value), label: `${value} questions`, tone: "blue" }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold text-[var(--ink-soft)]">Default quiz mode</label>
              <PaperSelect
                tone="green"
                value={settings.defaultQuizMode}
                onValueChange={(value) => updateSettings({ defaultQuizMode: value as QuizModeSetting })}
                options={[
                  { value: "practice", label: "Practice with feedback", tone: "green" },
                  { value: "exam", label: "Exam without feedback", tone: "rose" },
                ]}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--sp-rose)]" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Privacy & data</h2>
          </div>
          <div className="rounded-[8px] border border-[#d2abb7] bg-[var(--sp-rose-wash)] p-4">
            <p className="text-[12.5px] leading-relaxed text-[var(--ink-soft)]">
              SAT Nexus stores practice history locally to create analytics, mistakes, notes, favorites, and collections. Question-bank content is never removed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={cn("btn", confirm === "progress" ? "btn-danger" : "btn-soft")} onClick={() => clearData("progress")} disabled={Boolean(clearing)}>
                {clearing === "progress" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {confirm === "progress" ? "Click again to clear history" : "Clear analytics & attempts"}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => clearData("all")} disabled={Boolean(clearing)}>
                {clearing === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {confirm === "all" ? "Click again to erase everything" : "Erase all personal data"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </PaperDialog>
  );
}
