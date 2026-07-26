"use client";

import { cn } from "@/lib/utils";
import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement> & { hover?: boolean };

export function GlassCard({ className, children, hover = true, ...props }: DivProps) {
  return (
    <div
      {...props}
      className={cn(
        "glass relative overflow-hidden transition-colors duration-150",
        hover && "hover:border-[#b7afa1]",
        className,
      )}
    >
      {children}
    </div>
  );
}
