"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PaperDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="paper-fade fixed inset-0 z-[998] bg-[rgba(43,40,33,0.42)] backdrop-blur-[3px]" />
        <DialogPrimitive.Content
          className={cn(
            "paper-pop fixed left-1/2 top-1/2 z-[999] max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#e2dbc9] bg-[#fffdf8] p-6 shadow-[0_28px_70px_rgba(43,40,33,0.30)] scrollbar-thin focus:outline-none",
            wide ? "max-w-3xl" : "max-w-md",
            className,
          )}
        >
          <div className="relative">
            {title && (
              <DialogPrimitive.Title className="font-display pr-8 text-xl font-semibold text-[#2b2b2a]">
                {title}
              </DialogPrimitive.Title>
            )}
            {description && (
              <DialogPrimitive.Description className="mt-1 text-sm text-[#8a8680]">
                {description}
              </DialogPrimitive.Description>
            )}
            <DialogPrimitive.Close asChild>
              <button
                aria-label="Close"
                className="absolute -top-1 right-0 rounded-lg p-1.5 text-[#8a8680] transition-colors hover:bg-[#f2ecdd] hover:text-[#2b2b2a]"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </DialogPrimitive.Close>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default PaperDialog;
