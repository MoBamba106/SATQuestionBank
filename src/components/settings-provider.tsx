"use client";

import * as React from "react";

export type AppTheme = "light" | "dark" | "obsidian" | "highlighter" | "liquid-glass" | "soft-paper";
export type FontScale = "small" | "default" | "large";
export type QuizModeSetting = "practice" | "exam";

export type AppSettings = {
  theme: AppTheme;
  fontScale: FontScale;
  reducedMotion: boolean;
  compactMode: boolean;
  showTimer: boolean;
  defaultQuizSize: number;
  defaultQuizMode: QuizModeSetting;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "soft-paper",
  fontScale: "default",
  reducedMotion: false,
  compactMode: false,
  showTimer: true,
  defaultQuizSize: 10,
  defaultQuizMode: "practice",
};

const STORAGE_KEY = "sat-nexus-settings-v1";

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
  root.style.colorScheme = ["dark", "obsidian"].includes(settings.theme) ? "dark" : "light";
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<AppSettings>;
          setSettings({ ...DEFAULT_SETTINGS, ...saved });
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

  const updateSettings = React.useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const resetSettings = React.useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else to do.
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, ready, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const value = React.useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
