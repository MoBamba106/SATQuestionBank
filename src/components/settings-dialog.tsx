"use client";

import * as React from "react";
import {
  Accessibility,
  Check,
  Clock3,
  Compass,
  Database,
  Eye,
  Focus,
  LayoutGrid,
  Loader2,
  Maximize2,
  PlayCircle,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Tags,
  Trash2,
  Trophy,
  Type,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { PaperSelect } from "@/components/ui/paper-select";
import { apiDelete, apiPatch, useApi, mutateKey } from "@/lib/api-client";
import {
  type AppTheme,
  type FontScale,
  type NavMode,
  type QuizModeSetting,
  useSettings,
} from "@/components/settings-provider";
import { useAuth } from "@/components/auth-provider";
import { useAccountGate } from "@/components/account-gate";
import { resetTutorial } from "@/components/intro-tutorial";
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
  { id: "paper", name: "Paper", description: "Deckled handmade stationery", swatches: ["#f1eadc", "#e8dece", "#67c7be", "#b96d36"] },
  { id: "cardboard", name: "Cardboard", description: "Kraft board, ink and tape", swatches: ["#b88955", "#d1ad7b", "#5b412d", "#e8d3ad"] },
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
  const auth = useAuth();
  const { requireAccount } = useAccountGate();
  const [clearing, setClearing] = React.useState<"progress" | "all" | null>(null);
  const [confirm, setConfirm] = React.useState<"progress" | "all" | null>(null);
  const { data: profile } = useApi<{ hideLeaderboard: boolean }>(
    open && !auth.user.isGuest ? "/api/profile" : null,
    "profile",
  );
  const [savingLeaderboard, setSavingLeaderboard] = React.useState(false);
  const [hideLeaderboard, setHideLeaderboard] = React.useState(false);

  React.useEffect(() => {
    if (!profile) return;
    const timer = window.setTimeout(() => setHideLeaderboard(Boolean(profile.hideLeaderboard)), 0);
    return () => window.clearTimeout(timer);
  }, [profile]);

  const toggleLeaderboardOptOut = async (next: boolean) => {
    if (!requireAccount("The leaderboard opt-out")) return;
    setHideLeaderboard(next);
    setSavingLeaderboard(true);
    try {
      await apiPatch("/api/profile", { hideLeaderboard: next });
      mutateKey("leaderboard");
      mutateKey("profile");
      toast.success(next ? "You're hidden from leaderboards" : "You'll appear on leaderboards");
    } catch (error) {
      setHideLeaderboard(!next);
      toast.error("Couldn't update leaderboard preference", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSavingLeaderboard(false);
    }
  };

  const pickTheme = (theme: AppTheme) => {
    if (theme !== settings.theme && !requireAccount("Changing the theme")) return;
    updateSettings({ theme });
  };

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
                  onClick={() => pickTheme(theme.id)}
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
            <Toggle checked={settings.soundEffects} onChange={(soundEffects) => updateSettings({ soundEffects })} label="Subtle interface sounds" description="Quiet tactile cues for buttons and toggles. On by default." icon={Volume2} />
            <Toggle checked={settings.showStepperLogin} onChange={(showStepperLogin) => updateSettings({ showStepperLogin })} label="Stepper login" description="Enable stepper-based sign-in UI." icon={Accessibility} />
            <Toggle checked={settings.expandPassages} onChange={(expandPassages) => updateSettings({ expandPassages })} label="Expand reading passages" description="Show the full passage without an inner scroll box. Turn off to keep a compact scroll window." icon={Maximize2} />
            <Toggle checked={settings.focusModeDefault} onChange={(focusModeDefault) => updateSettings({ focusModeDefault })} label="Focus mode for practice tests" description="Start Bluebook tests fullscreen-style: hide the sidebar and chrome. Leave test with the red exit button." icon={Focus} />
            <Toggle checked={settings.showQuestionMeta} onChange={(showQuestionMeta) => updateSettings({ showQuestionMeta })} label="Show question category & difficulty" description="Display the section, skill, and difficulty badges above questions in quizzes and practice tests." icon={Tags} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--sp-teal,var(--accent))]" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Navigation style</h2>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {([
              { id: "default", name: "Default", description: "Classic left sidebar with every page." },
              { id: "keyboard", name: "Keyboard", description: "No sidebar — navigate with Ctrl+K or /. Just the book icon stays top-left." },
              { id: "dock", name: "Dock", description: "A floating macOS-style dock replaces the sidebar." },
            ] as { id: NavMode; name: string; description: string }[]).map((mode) => {
              const active = settings.navMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updateSettings({ navMode: mode.id })}
                  className={cn(
                    "relative rounded-[8px] border p-3 text-left transition-colors",
                    active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--paper-raised)] hover:bg-[var(--paper-soft)]",
                  )}
                >
                  {active && <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--accent)]" strokeWidth={3} />}
                  <span className="text-[13.5px] font-bold text-[var(--ink)]">{mode.name}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--ink-faint)]">{mode.description}</span>
                </button>
              );
            })}
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
            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold text-[var(--ink-soft)]">Question bank page size</label>
              <PaperSelect
                tone="lavender"
                value={String(settings.bankPageSize)}
                onValueChange={(value) => updateSettings({ bankPageSize: Number(value) })}
                options={[12, 24, 48, 96].map((value) => ({ value: String(value), label: `${value} per page`, tone: "lavender" as const }))}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--sp-yellow,var(--accent))]" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Community & help</h2>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Toggle
              checked={hideLeaderboard}
              onChange={(next) => void toggleLeaderboardOptOut(next)}
              label={savingLeaderboard ? "Saving…" : "Hide me from leaderboards"}
              description={auth.user.isGuest ? "Sign in to control your leaderboard visibility." : "Opt out of all public leaderboards. You can rejoin anytime."}
              icon={Trophy}
            />
            <button
              type="button"
              onClick={() => {
                resetTutorial();
                onOpenChange(false);
                window.dispatchEvent(new CustomEvent("sat-start-tutorial"));
              }}
              className="flex w-full items-center gap-3 rounded-[7px] border border-[var(--line)] bg-[var(--paper-raised)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--paper-soft)]"
            >
              <PlayCircle className="h-4.5 w-4.5 shrink-0 text-[var(--accent)]" />
              <span className="min-w-0 grow">
                <span className="block text-[13.5px] font-semibold text-[var(--ink)]">Replay the intro tutorial</span>
                <span className="block text-[11.5px] leading-snug text-[var(--ink-faint)]">Take the guided tour of the site again.</span>
              </span>
            </button>
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
