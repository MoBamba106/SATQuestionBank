"use client";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import React from "react";

export function GlassCard({ className, children, hover=true, ...props }: HTMLMotionProps<"div"> & { hover?: boolean }) {
  return (
    <motion.div
      {...props}
      className={cn("glass rounded-[22px] relative scanlines overflow-hidden", hover && "transition-transform hover:-translate-y-[2px] hover:shadow-neon-cyan/20", className)}
      whileHover={hover ? { y: -3 } : undefined}
    >
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{background:"linear-gradient(180deg, rgba(255,255,255,0.07), transparent 35%)"}} />
      {children}
    </motion.div>
  );
}
