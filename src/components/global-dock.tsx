"use client";

import React from "react";
import Dock from "./react-bits/Dock";
import { useRouter } from "next/navigation";
import { Library, PenSquare, LayoutDashboard, MonitorSmartphone } from "lucide-react";

export function GlobalDock() {
  const router = useRouter();

  const items = [
    { 
      icon: <LayoutDashboard size={20} color="var(--ink)" />, 
      label: 'Desk', 
      onClick: () => router.push('/') 
    },
    { 
      icon: <Library size={20} color="var(--ink)" />, 
      label: 'Bank', 
      onClick: () => router.push('/bank') 
    },
    { 
      icon: <PenSquare size={20} color="var(--ink)" />, 
      label: 'Quiz', 
      onClick: () => router.push('/quiz') 
    },
    { 
      icon: <MonitorSmartphone size={20} color="var(--ink)" />, 
      label: 'Tests', 
      onClick: () => router.push('/bluebook') 
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] md:hidden">
      <Dock 
        items={items}
        panelHeight={60}
        baseItemSize={44}
        magnification={60}
        className="!bg-[var(--paper-raised)] !border-[var(--line)] !shadow-xl"
      />
    </div>
  );
}
