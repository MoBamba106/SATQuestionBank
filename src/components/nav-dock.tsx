"use client";

import React from "react";
import Dock from "./react-bits/Dock";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  CalendarClock,
  Folders,
  LayoutDashboard,
  Library,
  MessageSquarePlus,
  MonitorSmartphone,
  PenSquare,
  RotateCcw,
  Search,
  Cog,
  Trophy,
} from "lucide-react";

/**
 * Full navigation dock — replaces the sidebar when the "Dock" navigation
 * style is selected in Settings. Mirrors every sidebar destination.
 */
export function NavDock({
  onOpenSettings,
  onOpenPalette,
}: {
  onOpenSettings: () => void;
  onOpenPalette: () => void;
}) {
  const router = useRouter();

  const items = [
    { icon: <LayoutDashboard size={19} color="var(--ink)" />, label: "Study desk", onClick: () => router.push("/") },
    { icon: <BookMarked size={19} color="var(--ink)" />, label: "Study library", onClick: () => router.push("/study") },
    { icon: <PenSquare size={19} color="var(--ink)" />, label: "Practice quiz", onClick: () => router.push("/quiz") },
    { icon: <Library size={19} color="var(--ink)" />, label: "Question bank", onClick: () => router.push("/bank") },
    { icon: <MonitorSmartphone size={19} color="var(--ink)" />, label: "Practice tests", onClick: () => router.push("/bluebook") },
    { icon: <Folders size={19} color="var(--ink)" />, label: "Collections", onClick: () => router.push("/collections") },
    { icon: <RotateCcw size={19} color="var(--ink)" />, label: "Mistakes", onClick: () => router.push("/mistakes") },
    { icon: <BarChart3 size={19} color="var(--ink)" />, label: "Analytics", onClick: () => router.push("/analytics") },
    { icon: <CalendarClock size={19} color="var(--ink)" />, label: "Sessions", onClick: () => router.push("/study-sessions") },
    { icon: <Trophy size={19} color="var(--ink)" />, label: "Leaderboard", onClick: () => router.push("/leaderboard") },
    { icon: <MessageSquarePlus size={19} color="var(--ink)" />, label: "Feedback", onClick: () => router.push("/feedback") },
    { icon: <Search size={19} color="var(--ink)" />, label: "Go to…", onClick: onOpenPalette },
    { icon: <Cog size={19} color="var(--ink)" />, label: "Settings", onClick: onOpenSettings },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] hidden -translate-x-1/2 md:block">
      <Dock
        items={items}
        panelHeight={64}
        baseItemSize={44}
        magnification={64}
        className="!border-[var(--line)] !bg-[var(--paper-raised)] !shadow-xl"
      />
    </div>
  );
}
