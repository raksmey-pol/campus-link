"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  Share2,
  ShieldCheck,
  User,
  FileText,
  Handshake,
} from "lucide-react";
import { ApiFetchError } from "@/lib/fetch";
import {
  fetchLostFoundFeedItemById,
  resolveItem,
  submitItemClaim,
  type LostFoundFeedItem,
  type LostFoundFeedStatus,
} from "@/lib/services/lost-found";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const statusChipClassByStatus: Record<LostFoundFeedStatus, string> = {
  PENDING: "bg-muted/90 text-muted-foreground",
  APPROVED: "bg-warning/15 text-warning",
  CLAIMED: "bg-info/15 text-info",
  RESOLVED: "bg-primary/10 text-primary",
  REJECTED: "bg-destructive/10 text-destructive",
};

const statusLabelByStatus: Record<LostFoundFeedStatus, string> = {
  PENDING: "Pending Verification",
  APPROVED: "Available to Claim",
  CLAIMED: "Claim in Progress",
  RESOLVED: "Resolved",
  REJECTED: "Not Public",
};

const valueLabelByTier: Record<LostFoundFeedItem["valueTier"], string> = {
  LOW: "Low Value",
  MEDIUM: "Standard Value",
  HIGH: "High Value",
  VERY_HIGH: "Very High Value",
};

const valueTierBadgeByTier: Record<LostFoundFeedItem["valueTier"], string> = {
  LOW: "bg-success/10 text-success",
  MEDIUM: "bg-warning/10 text-warning",
  HIGH: "bg-destructive/10 text-destructive",
  VERY_HIGH: "bg-destructive text-destructive-foreground",
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown date";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function claimButtonText(status: LostFoundFeedStatus) {
  if (status === "APPROVED") {
    return "Claim This Item";
  }

  if (status === "PENDING") {
    return "Awaiting Moderation";
  }

  if (status === "CLAIMED") {
    return "Claim in Progress";
  }

  if (status === "RESOLVED") {
    return "Already Resolved";
  }

  return "Unavailable";
}

function canClaim(status: LostFoundFeedStatus) {
  return status === "APPROVED";
}

function timelineState(status: LostFoundFeedStatus) {
  return {
    reported: true,
    approved: status !== "PENDING" && status !== "REJECTED",
    claimed: status === "CLAIMED" || status === "RESOLVED",
    resolved: status === "RESOLVED",
  };
}

export default function LostFoundItemDetail() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const itemId = Number(rawId);
  const { user } = useAuth();

  const [item, setItem] = useState<LostFoundFeedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [proofDescription, setProofDescription] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimErrorMessage, setClaimErrorMessage] = useState<string | null>(
    null,
  );
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(
    null,
  );
  const [isConfirmingHandoff, setIsConfirmingHandoff] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawId || Number.isNaN(itemId)) {
      setIsLoading(false);
      setErrorMessage("Invalid item id.");
      return;
    }

    let canceled = false;

    async function loadItem() {
      setIsLoading(true);
      setErrorMessage(null);
      setRequiresLogin(false);
      setClaimDialogOpen(false);
      setProofDescription("");
      setClaimErrorMessage(null);
      setClaimSuccessMessage(null);

      try {
        const payload = await fetchLostFoundFeedItemById(itemId);
        if (!canceled) {
          setItem(payload);
        }
      } catch (error) {
        if (canceled) {
          return;
        }

        if (
          error instanceof ApiFetchError &&
          (error.status === 401 || error.status === 403)
        ) {
          setRequiresLogin(true);
          setErrorMessage(null);
        } else if (error instanceof ApiFetchError && error.status === 404) {
          setErrorMessage("This item no longer exists.");
        } else {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load this item right now.",
          );
        }

        setItem(null);
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    }

    void loadItem();

    return () => {
      canceled = true;
    };
  }, [rawId, itemId]);

  async function handleClaimSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!item) {
      return;
    }

    if (!canClaim(item.status)) {
      setClaimErrorMessage(
        "This item is not currently available for claiming.",
      );
      return;
    }

    const normalizedProof = proofDescription.trim();
    if (normalizedProof.length < 10) {
      setClaimErrorMessage(
        "Please provide at least 10 characters of ownership proof.",
      );
      return;
    }

    setIsSubmittingClaim(true);
    setClaimErrorMessage(null);
    setClaimSuccessMessage(null);

    try {
      await submitItemClaim(item.id, normalizedProof);

      setClaimDialogOpen(false);
      setProofDescription("");
      setClaimSuccessMessage(
        "Claim submitted. The finder will review your request.",
      );
      setItem((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          claimSummary: {
            ...current.claimSummary,
            totalClaims: current.claimSummary.totalClaims + 1,
            pendingClaims: current.claimSummary.pendingClaims + 1,
            latestClaimSubmittedAt: new Date().toISOString(),
          },
        };
      });
    } catch (error) {
      if (
        error instanceof ApiFetchError &&
        (error.status === 401 || error.status === 403)
      ) {
        setRequiresLogin(true);
        setClaimDialogOpen(false);
        return;
      }

      setClaimErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit your claim right now.",
      );
    } finally {
      setIsSubmittingClaim(false);
    }
  }

  async function handleConfirmHandoff() {
    if (!item) return;
    setIsConfirmingHandoff(true);
    setHandoffError(null);
    setHandoffMessage(null);
    try {
      const result = await resolveItem(item.id);
      setHandoffMessage(result.message);
      setItem((current) => {
        if (!current) return current;
        const bothConfirmed = result.resolved;
        const isFinder = user?.id === current.reporterId;
        return {
          ...current,
          status: bothConfirmed ? "RESOLVED" : current.status,
          resolveState: {
            ...current.resolveState,
            isResolved: result.resolved,
            finderConfirmed: isFinder ? true : current.resolveState.finderConfirmed,
            claimerConfirmed: !isFinder ? true : current.resolveState.claimerConfirmed,
            resolvedAt: result.resolved ? new Date().toISOString() : current.resolveState.resolvedAt,
          },
        };
      });
    } catch (error) {
      setHandoffError(
        error instanceof Error ? error.message : "Unable to confirm handoff.",
      );
    } finally {
      setIsConfirmingHandoff(false);
    }
  }

  const steps = useMemo(() => {
    if (!item) {
      return null;
    }

    return timelineState(item.status);
  }, [item]);

  const proofCharacterCount = proofDescription.trim().length;
  const canSubmitClaimForm = !isSubmittingClaim && proofCharacterCount >= 10;

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-12">
        <div className="p-4 sm:p-6">
          <div className="h-9 w-28 animate-pulse rounded-full bg-muted" />
          <div className="mt-4 h-72 animate-pulse rounded-2xl bg-muted" />
          <div className="mt-4 h-52 animate-pulse rounded-2xl bg-muted" />
          <div className="mt-4 h-36 animate-pulse rounded-2xl bg-muted" />
        </div>
      </main>
    );
  }

  if (requiresLogin) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-12">
        <div className="p-4 sm:p-6">
          <Link
            href="/lost-found"
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <section className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Sign in to view this item
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Detailed claim data is available for authenticated users only.
            </p>
            <Link href="/login" className="mt-5 inline-block">
              <Button className="h-10 rounded-xl px-6">Go to Login</Button>
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-12">
        <div className="p-4 sm:p-6">
          <Link
            href="/lost-found"
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <section className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <h1 className="text-xl font-bold text-foreground">
              Item not available
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {errorMessage ?? "This item could not be found."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-12">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              href="/lost-found"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
              aria-label="Back to lost and found"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <h1 className="text-base font-bold text-foreground">Lost &amp; Found</h1>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Share item"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Hero image */}
      <section className="relative h-[260px] w-full overflow-hidden sm:h-[320px]">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent via-muted to-accent">
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                No photo
              </p>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Status badge */}
        <div className="absolute right-4 top-4">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] backdrop-blur-sm",
              statusChipClassByStatus[item.status],
            )}
          >
            {statusLabelByStatus[item.status]}
          </span>
        </div>

        {/* Title overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <h2 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-3xl">
            {item.title}
          </h2>
        </div>
      </section>

      <div className="space-y-4 px-4 pt-4 sm:px-6">

        {/* Info card */}
        <section className="rounded-2xl bg-card shadow-card overflow-hidden">
          {/* Value tier banner */}
          <div
            className={cn(
              "flex items-center justify-between px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em]",
              valueTierBadgeByTier[item.valueTier],
            )}
          >
            <span>{valueLabelByTier[item.valueTier]}</span>
            {(item.valueTier === "HIGH" || item.valueTier === "VERY_HIGH") && (
              <span>Urgent</span>
            )}
          </div>

          {/* Details */}
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MapPin className="h-3.5 w-3.5 text-foreground/60" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Location</p>
                  <p className="text-sm font-medium text-foreground">{item.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <CalendarDays className="h-3.5 w-3.5 text-foreground/60" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Reported</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(item.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <User className="h-3.5 w-3.5 text-foreground/60" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Reporter</p>
                  <p className="text-sm font-medium text-foreground">{item.reporterName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-3.5 w-3.5 text-foreground/60" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">Claims</p>
                  <p className="text-sm font-medium text-foreground">
                    {item.claimSummary.totalClaims} total
                    {item.claimSummary.pendingClaims > 0 && (
                      <span className="ml-1 text-warning">
                        ({item.claimSummary.pendingClaims} pending)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                Description
              </p>
              <p className="text-sm leading-relaxed text-foreground/85">
                {item.description}
              </p>
            </div>
          </div>
        </section>

        {/* Claim CTA or Handoff panel */}
        {item.status === "CLAIMED" && user &&
        (user.id === item.reporterId || user.id === item.approvedClaimerId) ? (
          <HandoffPanel
            isFinder={user.id === item.reporterId}
            finderConfirmed={item.resolveState.finderConfirmed}
            claimerConfirmed={item.resolveState.claimerConfirmed}
            isConfirming={isConfirmingHandoff}
            message={handoffMessage}
            error={handoffError}
            onConfirm={handleConfirmHandoff}
          />
        ) : (
          <section className="relative overflow-hidden rounded-2xl shadow-card">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(210_55%_22%)]" />
            <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/[0.06]" />
            <div className="absolute -top-6 left-1/3 h-20 w-20 rounded-full bg-white/[0.04]" />

            <div className="relative z-10 px-6 py-5">
              <h3 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Is this yours?
              </h3>
              <p className="mt-1.5 text-sm text-white/75 leading-relaxed">
                Submit a claim with proof only the true owner would know.
              </p>

              <Button
                type="button"
                className={cn(
                  "mt-4 h-11 w-full rounded-xl font-bold text-sm",
                  canClaim(item.status)
                    ? "bg-white text-primary hover:bg-white/90"
                    : "bg-white/20 text-white/60 cursor-not-allowed",
                )}
                disabled={!canClaim(item.status) || isSubmittingClaim}
                onClick={() => {
                  setClaimErrorMessage(null);
                  setClaimSuccessMessage(null);
                  setClaimDialogOpen(true);
                }}
              >
                <ShieldCheck className="mr-2 h-4.5 w-4.5" />
                {claimButtonText(item.status)}
              </Button>

              {claimSuccessMessage ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
                  <p className="text-sm text-white">{claimSuccessMessage}</p>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* Claim dialog */}
        <Dialog
          open={claimDialogOpen}
          onOpenChange={(open) => {
            setClaimDialogOpen(open);
            if (!open) {
              setClaimErrorMessage(null);
            }
          }}
        >
          <DialogContent className="rounded-2xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Claim: {item.title}</DialogTitle>
            </DialogHeader>

            <form className="space-y-4 pt-1" onSubmit={handleClaimSubmit}>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Share details only the real owner would know — identifying marks,
                what was inside, or where you lost it.
              </p>

              <Textarea
                value={proofDescription}
                onChange={(event) => setProofDescription(event.target.value)}
                className="min-h-[130px] rounded-xl"
                placeholder="e.g., It has my initials on the inside pocket and a red keychain attached."
                disabled={isSubmittingClaim}
              />

              <p
                className={cn(
                  "text-xs",
                  proofCharacterCount >= 10
                    ? "text-success"
                    : "text-muted-foreground",
                )}
              >
                {proofCharacterCount}/10+ characters required
              </p>

              {claimErrorMessage ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                  {claimErrorMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClaimDialogOpen(false)}
                  disabled={isSubmittingClaim}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmitClaimForm}>
                  {isSubmittingClaim ? "Submitting…" : "Submit Claim"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Status timeline */}
        {steps ? (
          <section className="rounded-2xl bg-card shadow-card p-5 sm:p-6">
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Status Timeline
            </p>

            <div className="space-y-0">
              <TimelineRow
                step={1}
                title="Reported"
                subtitle={`${formatDate(item.createdAt)} · ${item.location}`}
                active={steps.reported}
                continuation
              />
              <TimelineRow
                step={2}
                title="Approved"
                subtitle="Awaiting ownership claim"
                active={steps.approved}
                continuation
              />
              <TimelineRow
                step={3}
                title="Claimed"
                subtitle="Ownership verification in progress"
                active={steps.claimed}
                continuation
              />
              <TimelineRow
                step={4}
                title="Resolved"
                subtitle="Item returned to owner"
                active={steps.resolved}
              />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function HandoffPanel({
  isFinder,
  finderConfirmed,
  claimerConfirmed,
  isConfirming,
  message,
  error,
  onConfirm,
}: {
  isFinder: boolean;
  finderConfirmed: boolean;
  claimerConfirmed: boolean;
  isConfirming: boolean;
  message: string | null;
  error: string | null;
  onConfirm: () => void;
}) {
  const myConfirmed = isFinder ? finderConfirmed : claimerConfirmed;
  const otherConfirmed = isFinder ? claimerConfirmed : finderConfirmed;
  const otherLabel = isFinder ? "Owner" : "Finder";

  return (
    <section className="rounded-2xl bg-card shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 bg-info/10 px-5 py-3">
        <Handshake className="h-4 w-4 text-info" />
        <p className="text-sm font-semibold text-info">Handoff Confirmation</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Both the finder and the owner must confirm the physical handoff to
          close this case and award points.
        </p>

        {/* Confirmation status rows */}
        <div className="space-y-2">
          <ConfirmRow label="Finder" confirmed={finderConfirmed} isYou={isFinder} />
          <ConfirmRow label="Owner" confirmed={claimerConfirmed} isYou={!isFinder} />
        </div>

        {message ? (
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!myConfirmed ? (
          <Button
            type="button"
            className="w-full h-11 rounded-xl font-bold text-sm"
            disabled={isConfirming}
            onClick={onConfirm}
          >
            <Handshake className="mr-2 h-4 w-4" />
            {isConfirming ? "Confirming…" : "Confirm Handoff"}
          </Button>
        ) : !otherConfirmed ? (
          <p className="text-center text-sm text-muted-foreground py-1">
            Waiting for {otherLabel} to confirm…
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ConfirmRow({
  label,
  confirmed,
  isYou,
}: {
  label: string;
  confirmed: boolean;
  isYou: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {isYou ? (
          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            You
          </span>
        ) : null}
      </span>
      {confirmed ? (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirmed
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </span>
      )}
    </div>
  );
}

function TimelineRow({
  step,
  title,
  subtitle,
  active,
  continuation = false,
}: {
  step: number;
  title: string;
  subtitle: string;
  active: boolean;
  continuation?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
            active
              ? "bg-success text-white"
              : "bg-muted text-muted-foreground",
          )}
        >
          {active ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <span className="text-xs">{step}</span>
          )}
        </div>
        {continuation ? (
          <div
            className={cn(
              "my-1 h-8 w-0.5 rounded-full",
              active ? "bg-success/30" : "bg-border",
            )}
          />
        ) : null}
      </div>

      <div className={cn("pb-1", continuation ? "" : "")}>
        <p
          className={cn(
            "text-base font-bold leading-tight",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm",
            active ? "text-muted-foreground" : "text-muted-foreground/60",
          )}
        >
          {subtitle}
        </p>
        {continuation && <div className="h-3" />}
      </div>
    </div>
  );
}
