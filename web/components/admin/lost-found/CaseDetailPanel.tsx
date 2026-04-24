"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  ImageOff,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BackendClaim, ModerationCase } from "@/components/admin/types";

type CaseDetailPanelProps = {
  caseItem: ModerationCase;
  claims: BackendClaim[];
  claimsLoading: boolean;
  // Item moderation (PENDING)
  moderationReason: string;
  errorMessage?: string | null;
  onModerationReasonChange: (value: string) => void;
  onApproveItem: () => void;
  onRejectItem: () => void;
  // Claim moderation (APPROVED)
  onApproveClaim: (claimId: number) => void;
  onRejectClaim: (claimId: number, reason: string) => void;
  // Resolution (CLAIMED)
  onForceResolve: () => void;
  onClose: () => void;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

// ─── PENDING: approve / reject item ──────────────────────────────────────────

function ItemModerationView({
  caseItem,
  moderationReason,
  errorMessage,
  onModerationReasonChange,
  onApproveItem,
  onRejectItem,
}: Pick<
  CaseDetailPanelProps,
  "caseItem" | "moderationReason" | "errorMessage" | "onModerationReasonChange" | "onApproveItem" | "onRejectItem"
>) {
  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/60">
          {caseItem.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={caseItem.photoUrl}
              alt={caseItem.item}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
              <ImageOff className="h-8 w-8" />
              <span className="text-[10px] font-medium uppercase tracking-wider">No image attached</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Description</p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">{caseItem.description}</p>
        </div>

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

      <div className="border-t border-border bg-card p-4 space-y-2">
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
          <Button type="button" variant="destructive" className="h-9 rounded-lg text-xs" onClick={onRejectItem}>
            Reject
          </Button>
          <Button type="button" className="h-9 rounded-lg text-xs" onClick={onApproveItem}>
            Approve
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── APPROVED: claim review list ──────────────────────────────────────────────

function ClaimCard({
  claim,
  onApprove,
  onReject,
}: {
  claim: BackendClaim;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isPending = claim.status === "PENDING";

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      claim.status === "APPROVED" && "border-success/30 bg-success/5",
      claim.status === "REJECTED" && "border-destructive/20 bg-destructive/5",
      claim.status === "PENDING" && "border-border bg-muted/30",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {claim.claimer.display_name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">{claim.claimer.display_name}</p>
            <p className="text-[10px] text-muted-foreground">{formatDate(claim.created_at)}</p>
          </div>
        </div>
        <span className={cn(
          "inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
          claim.status === "APPROVED" && "bg-success/15 text-success",
          claim.status === "REJECTED" && "bg-destructive/10 text-destructive",
          claim.status === "PENDING" && "bg-warning/20 text-warning",
        )}>
          {claim.status}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-foreground">{claim.proof_description}</p>

      {claim.status === "REJECTED" && claim.rejection_reason && (
        <p className="text-[10px] italic text-destructive">Reason: {claim.rejection_reason}</p>
      )}

      {isPending && !showRejectForm && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-7 flex-1 rounded-md text-[11px] text-destructive border-destructive/40 hover:bg-destructive/5"
            onClick={() => setShowRejectForm(true)}
          >
            Reject
          </Button>
          <Button
            type="button"
            className="h-7 flex-1 rounded-md text-[11px]"
            onClick={onApprove}
          >
            Approve Claim
          </Button>
        </div>
      )}

      {isPending && showRejectForm && (
        <div className="space-y-1.5">
          <Textarea
            rows={2}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Rejection reason (required)..."
            className="rounded-md text-xs"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-7 flex-1 rounded-md text-[11px]"
              onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-7 flex-1 rounded-md text-[11px]"
              disabled={!rejectionReason.trim()}
              onClick={() => onReject(rejectionReason)}
            >
              Confirm Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimsReviewView({
  caseItem,
  claims,
  claimsLoading,
  errorMessage,
  onApproveClaim,
  onRejectClaim,
}: Pick<CaseDetailPanelProps, "caseItem" | "claims" | "claimsLoading" | "errorMessage" | "onApproveClaim" | "onRejectClaim">) {
  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Description</p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">{caseItem.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Location</p>
            <p className="mt-1 text-xs font-semibold text-foreground">{caseItem.location}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Reporter</p>
            <p className="mt-1 text-xs font-semibold text-foreground">{caseItem.reporter}</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Claim Submissions
            </p>
            {caseItem.claimSummary && (
              <span className="text-[10px] text-muted-foreground">
                {caseItem.claimSummary.totalClaims} total · {caseItem.claimSummary.pendingClaims} pending
              </span>
            )}
          </div>

          {claimsLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {!claimsLoading && claims.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <Clock className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />
              <p className="text-xs font-medium text-muted-foreground">No claims submitted yet</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">Item is live and visible to students</p>
            </div>
          )}

          {!claimsLoading && claims.length > 0 && (
            <div className="space-y-2">
              {claims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  onApprove={() => onApproveClaim(claim.id)}
                  onReject={(reason) => onRejectClaim(claim.id, reason)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="border-t border-border px-4 py-3">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        </div>
      )}
    </>
  );
}

// ─── CLAIMED: handoff confirmation + force-resolve ────────────────────────────

function HandoffView({
  caseItem,
  claims,
  claimsLoading,
  errorMessage,
  onForceResolve,
}: Pick<CaseDetailPanelProps, "caseItem" | "claims" | "claimsLoading" | "errorMessage" | "onForceResolve">) {
  const approvedClaim = claims.find((c) => c.status === "APPROVED");
  const finderConfirmed = caseItem.resolveState?.finderConfirmed ?? false;
  const claimerConfirmed = caseItem.resolveState?.claimerConfirmed ?? false;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="rounded-lg border border-info/30 bg-info/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-info">Item Claimed — Awaiting Handoff</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Both the finder and claimer must confirm the physical handoff to resolve this item.
          </p>
        </div>

        {claimsLoading && <div className="h-16 animate-pulse rounded-lg bg-muted" />}

        {!claimsLoading && approvedClaim && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Approved Claimer</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {approvedClaim.claimer.display_name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">{approvedClaim.claimer.display_name}</p>
                <p className="text-[10px] text-muted-foreground">Approved {formatDate(approvedClaim.reviewed_at)}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">&ldquo;{approvedClaim.proof_description}&rdquo;</p>
          </div>
        )}

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Handoff Confirmation</p>
          <div className="mt-2 space-y-2">
            <div className={cn(
              "flex items-center gap-2.5 rounded-lg border p-2.5",
              finderConfirmed ? "border-success/30 bg-success/5" : "border-border bg-muted/30",
            )}>
              {finderConfirmed
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                : <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <div>
                <p className="text-[11px] font-semibold text-foreground">Finder ({caseItem.reporter})</p>
                <p className="text-[10px] text-muted-foreground">{finderConfirmed ? "Confirmed handoff" : "Pending confirmation"}</p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-2.5 rounded-lg border p-2.5",
              claimerConfirmed ? "border-success/30 bg-success/5" : "border-border bg-muted/30",
            )}>
              {claimerConfirmed
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                : <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <div>
                <p className="text-[11px] font-semibold text-foreground">
                  Claimer ({approvedClaim?.claimer.display_name ?? "—"})
                </p>
                <p className="text-[10px] text-muted-foreground">{claimerConfirmed ? "Confirmed handoff" : "Pending confirmation"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-card p-4 space-y-2">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Admin override: immediately resolves the item and awards points to both parties.
        </p>
        <Button
          type="button"
          className="h-9 w-full rounded-lg text-xs"
          onClick={onForceResolve}
        >
          <ShieldCheck className="mr-2 h-3.5 w-3.5" />
          Force Resolve (Admin Override)
        </Button>
      </div>
    </>
  );
}

// ─── RESOLVED: read-only summary ─────────────────────────────────────────────

function ResolvedView({ caseItem }: { caseItem: ModerationCase }) {
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center">
        <UserCheck className="mx-auto mb-2 h-8 w-8 text-success" />
        <p className="text-sm font-bold text-success">Item Resolved</p>
        {caseItem.resolveState?.resolvedAt && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Resolved on {formatDate(caseItem.resolveState.resolvedAt)}
          </p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Item</p>
        <p className="mt-1 text-xs font-semibold text-foreground">{caseItem.item}</p>
        <p className="text-[11px] text-muted-foreground">{caseItem.location}</p>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Points Awarded</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Finder reward + claimer trust points were issued upon resolution.
        </p>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function CaseDetailPanel(props: CaseDetailPanelProps) {
  const { caseItem, onClose } = props;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-card shadow-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-primary">Case {caseItem.id}</h2>
            <p className="text-[11px] text-muted-foreground">{caseItem.item}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {caseItem.status === "Pending" && (
        <ItemModerationView
          caseItem={caseItem}
          moderationReason={props.moderationReason}
          errorMessage={props.errorMessage}
          onModerationReasonChange={props.onModerationReasonChange}
          onApproveItem={props.onApproveItem}
          onRejectItem={props.onRejectItem}
        />
      )}

      {caseItem.status === "Approved" && (
        <ClaimsReviewView
          caseItem={caseItem}
          claims={props.claims}
          claimsLoading={props.claimsLoading}
          errorMessage={props.errorMessage}
          onApproveClaim={props.onApproveClaim}
          onRejectClaim={props.onRejectClaim}
        />
      )}

      {caseItem.status === "Claimed" && (
        <HandoffView
          caseItem={caseItem}
          claims={props.claims}
          claimsLoading={props.claimsLoading}
          errorMessage={props.errorMessage}
          onForceResolve={props.onForceResolve}
        />
      )}

      {(caseItem.status === "Resolved" || caseItem.status === "Rejected") && (
        <ResolvedView caseItem={caseItem} />
      )}
    </aside>
  );
}
