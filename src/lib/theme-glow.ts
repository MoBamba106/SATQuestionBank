import type { AppTheme } from "@/components/settings-provider";

/**
 * Magic Bento glow color per theme. The demo component ships purple-only;
 * these keep the glow in step with each theme's accent personality.
 */
export const THEME_GLOW: Record<AppTheme, string> = {
  light: "#19a7e0",
  dark: "#ffffff",
  obsidian: "#8400ff",
  highlighter: "#f090a0",
  "liquid-glass": "#6699ff",
  "soft-paper": "#4fc4b8",
  paper: "#67c7be",
  cardboard: "#e8bd66",
  maroon: "#800000",
};

export function glowColorForTheme(theme: AppTheme): string {
  return THEME_GLOW[theme] ?? "#19a7e0";
}
