"use client";

import { AlertCircle, CheckCircle2, ImageOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ModerationCase } from "@/components/admin/types";

type CaseDetailPanelProps = {
  caseItem: ModerationCase;
  moderationReason: string;
  errorMessage?: string | null;
  onModerationReasonChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
};

export function CaseDetailPanel({
  caseItem,
  moderationReason,
  errorMessage,
  onModerationReasonChange,
  onApprove,
  onReject,
  onClose,
}: CaseDetailPanelProps) {
  const isFlagged = caseItem.aiStatus === "Flagged";

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-card shadow-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-primary">Case {caseItem.id}</h2>
            <p className="text-[11px] text-muted-foreground">{caseItem.item}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* Image placeholder */}
        <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-muted/60">
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
            <ImageOff className="h-8 w-8" />
            <span className="text-[10px] font-medium uppercase tracking-wider">No image attached</span>
          </div>
        </div>

        {/* AI Pre-screen */}
        <div
          className={cn(
            "rounded-lg border-l-4 p-3",
            isFlagged ? "border-destructive bg-destructive/5" : "border-success bg-success/5",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isFlagged ? (
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              )}
              <p className={cn("text-[10px] font-bold uppercase tracking-[0.1em]", isFlagged ? "text-destructive" : "text-success")}>
                AI Pre-Screen: {caseItem.aiStatus}
              </p>
            </div>
            <p className="text-[11px] font-semibold text-foreground">{caseItem.aiMatch}% Match</p>
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Object</span>
              <span className="font-medium text-foreground">{caseItem.objectRecognition}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Policy</span>
              <span className={cn("font-medium", isFlagged ? "text-destructive" : "text-success")}>
                {caseItem.policyRisk}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium text-foreground">{caseItem.locationContext}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Description</p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">{caseItem.description}</p>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Location</p>
            <p className="mt-1 text-xs font-semibold text-foreground">{caseItem.location}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Time Found</p>
            <p className="mt-1 text-xs font-semibold text-foreground">{caseItem.timeFound}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Reporter</p>
            <p className="mt-1 text-xs font-semibold text-foreground">{caseItem.reporter}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Priority</p>
            <p className={cn("mt-1 text-xs font-semibold", caseItem.casePriority === "High Priority" ? "text-destructive" : "text-muted-foreground")}>
              {caseItem.casePriority}
            </p>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="border-t border-border bg-card p-4">
        <div className="space-y-2">
          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Moderation Reason
          </label>
          <Textarea
            rows={3}
            value={moderationReason}
            onChange={(e) => onModerationReasonChange(e.target.value)}
            placeholder="Explain your decision..."
            className="rounded-lg text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="destructive"
              className="h-9 rounded-lg text-xs"
              onClick={onReject}
            >
              Reject
            </Button>
            <Button
              type="button"
              className="h-9 rounded-lg text-xs"
              onClick={onApprove}
            >
              Approve
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
