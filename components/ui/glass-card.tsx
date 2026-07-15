"use client";
import { cn } from "@/lib/utils";
import React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement> & { hover?: boolean };

export function GlassCard({ className, children, hover=true, ...props }: DivProps) {
  return (
    <div
      {...props}
      className={cn(
        "glass rounded-[20px] relative overflow-hidden transition-all duration-200",
        hover && "hover:-translate-y-[2px] hover:shadow-paper-lg",
        className
      )}
    >
      {children}
    </div>
  );
}

// lightweight – no framer-motion per card (was causing 3k+ motion nodes lag)
