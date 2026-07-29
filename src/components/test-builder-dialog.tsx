import * as React from "react";
import Stepper, { Step } from "@/components/react-bits/Stepper";
import { PaperDialog } from "@/components/ui/paper-dialog";
import { Loader2 } from "lucide-react";

export function TestBuilderDialog({ open, onClose, onGenerate, generating }: { open: boolean, onClose: () => void, onGenerate: () => void, generating: boolean }) {
  return (
    <PaperDialog open={open} onOpenChange={onClose} title="Custom Test Builder">
      <div className="p-2 w-full max-w-lg min-h-[300px] flex flex-col justify-between">
        <Stepper 
          initialStep={1}
          onFinalStepCompleted={onGenerate}
          backButtonText="Back"
          nextButtonText={generating ? "Generating..." : "Next"}
          disableStepIndicators={false}
          nextButtonProps={{ disabled: generating }}
        >
          <Step>
            <div className="p-4 bg-[var(--paper-soft)] rounded-[8px] border border-[var(--line)]">
              <h3 className="font-bold text-[var(--ink)] mb-2">Select Test Focus</h3>
              <p className="text-[13px] text-[var(--ink-faint)] mb-4">Choose if you want to focus on specific domains or take a balanced test.</p>
              <select className="w-full bg-[var(--paper-raised)] border border-[var(--line)] rounded p-2 text-sm text-[var(--ink)]">
                <option>Balanced (Full Digital SAT)</option>
                <option>Reading & Writing Heavy</option>
                <option>Math Heavy</option>
              </select>
            </div>
          </Step>

          <Step>
            <div className="p-4 bg-[var(--paper-soft)] rounded-[8px] border border-[var(--line)]">
              <h3 className="font-bold text-[var(--ink)] mb-2">Target Difficulty</h3>
              <p className="text-[13px] text-[var(--ink-faint)] mb-4">Select the difficulty distribution for the first modules.</p>
              <select className="w-full bg-[var(--paper-raised)] border border-[var(--line)] rounded p-2 text-sm text-[var(--ink)]">
                <option>Adaptive (Standard)</option>
                <option>Hard (Advanced Practice)</option>
                <option>Medium (Building Foundations)</option>
              </select>
            </div>
          </Step>

          <Step>
            <div className="p-4 bg-[var(--paper-soft)] rounded-[8px] border border-[var(--line)] text-center py-10">
              <h3 className="font-display font-bold text-xl text-[var(--ink)] mb-2">Ready to Build!</h3>
              <p className="text-[14px] text-[var(--ink-faint)]">Click Generate to construct your custom test using the official question bank.</p>
              {generating && <Loader2 className="animate-spin mx-auto mt-4 text-[var(--accent)]" />}
            </div>
          </Step>
        </Stepper>
      </div>
    </PaperDialog>
  );
}
