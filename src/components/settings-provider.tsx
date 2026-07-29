"use client";

import * as React from "react";

export type AppTheme = "light" | "dark" | "obsidian" | "highlighter" | "liquid-glass" | "soft-paper" | "paper" | "cardboard";
export type FontScale = "small" | "default" | "large";
export type QuizModeSetting = "practice" | "exam";
export type PassageLayout = "scroll" | "expand";

export type AppSettings = {
  theme: AppTheme;
  fontScale: FontScale;
  reducedMotion: boolean;
  compactMode: boolean;
  showTimer: boolean;
  soundEffects: boolean;
  showDock: boolean;
  showStepperLogin: boolean;
  defaultQuizSize: number;
  defaultQuizMode: QuizModeSetting;
  /** When true, reading passages grow to full height instead of a fixed scroll box. */
  expandPassages: boolean;
  /** Default focus mode for Bluebook practice tests (hide chrome, fullscreen-like). */
  focusModeDefault: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "soft-paper",
  fontScale: "default",
  reducedMotion: false,
  compactMode: false,
  showTimer: true,
  soundEffects: true,
  showDock: true,
  showStepperLogin: false,
  defaultQuizSize: 10,
  defaultQuizMode: "practice",
  expandPassages: false,
  focusModeDefault: false,
};

const STORAGE_KEY = "sat-nexus-settings-v3";
const LEGACY_STORAGE_KEYS = ["sat-nexus-settings-v2", "sat-nexus-settings-v1"];

type SettingsContextValue = {
  settings: AppSettings;
  ready: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
};

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

function applySettings(settings: AppSettings) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.fontScale = settings.fontScale;
  root.dataset.density = settings.compactMode ? "compact" : "comfortable";
  root.dataset.reduceMotion = settings.reducedMotion ? "true" : "false";
  root.dataset.expandPassages = settings.expandPassages ? "true" : "false";
  root.style.colorScheme = ["dark", "obsidian"].includes(settings.theme) ? "dark" : "light";
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        let raw = window.localStorage.getItem(STORAGE_KEY);
        let fromLegacy = false;
        if (!raw) {
          for (const key of LEGACY_STORAGE_KEYS) {
            raw = window.localStorage.getItem(key);
            if (raw) {
              fromLegacy = true;
              break;
            }
          }
        }
        if (raw) {
          const saved = JSON.parse(raw) as Partial<AppSettings>;
          setSettings({
            ...DEFAULT_SETTINGS,
            ...saved,
            // v1 shipped muted sounds; enable when migrating from that only.
            ...(fromLegacy && saved.soundEffects == null ? { soundEffects: true } : {}),
          });
        }
      } catch {
        // Invalid or unavailable local storage falls back to safe defaults.
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    applySettings(settings);
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // The app remains usable when persistence is unavailable.
    }
  }, [settings, ready]);

  React.useEffect(() => {
    if (!settings.soundEffects) return;
    let audioContext: AudioContext | null = null;
    const playClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest("button, a, [role='button'], [role='switch'], [role='option']");
      if (!interactive || interactive.hasAttribute("disabled")) return;
      audioContext ??= new AudioContext();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(430, now);
      oscillator.frequency.exponentialRampToValueAtTime(560, now + 0.035);
      gain.gain.setValueAtTime(0.018, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.045);
    };
    document.addEventListener("pointerdown", playClick, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", playClick, { capture: true });
      void audioContext?.close();
    };
  }, [settings.soundEffects]);

  const updateSettings = React.useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const resetSettings = React.useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);
    } catch {
      // Nothing else to do.
    }
  }, []);

  const contextValue = React.useMemo(
    () => ({ settings, ready, updateSettings, resetSettings }),
    [settings, ready, updateSettings, resetSettings],
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const value = React.useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
