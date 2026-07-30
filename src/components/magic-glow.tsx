"use client";

import * as React from "react";
import { useSettings } from "@/components/settings-provider";
import { glowColorForTheme } from "@/lib/theme-glow";
import { cn } from "@/lib/utils";

/**
 * Lightweight Magic Bento-style hover glow that wraps any card.
 * The glow border follows the cursor and the color adapts to the active theme
 * (purple for Obsidian, cyan for Dark, teal for Soft Paper, and so on).
 */
export function MagicGlow({
  children,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { settings } = useSettings();
  const ref = React.useRef<HTMLDivElement>(null);
  const glow = glowColorForTheme(settings.theme);
  const off = disabled || settings.reducedMotion;

  const handleMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mg-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--mg-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    el.style.setProperty("--mg-intensity", "1");
  }, []);

  const handleLeave = React.useCallback(() => {
    ref.current?.style.setProperty("--mg-intensity", "0");
  }, []);

  if (off) return <div className={className}>{children}</div>;

  return (
    <div
      ref={ref}
      className={cn("magic-glow-card", className)}
      style={{ "--mg-color": glow } as React.CSSProperties}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
    </div>
  );
}
