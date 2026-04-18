"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Circle,
  Info,
  MapPin,
  Share2,
  ShieldCheck,
  User,
} from "lucide-react";
import { ApiFetchError } from "@/lib/fetch";
import {
  fetchLostFoundFeedItemById,
  type LostFoundFeedItem,
  type LostFoundFeedStatus,
} from "@/lib/services/lost-found";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusChipClassByStatus: Record<LostFoundFeedStatus, string> = {
  PENDING: "bg-[#fef4f4] text-[#7b2030]",
  APPROVED: "bg-[#f8edd8] text-[#895f1e]",
  CLAIMED: "bg-[#ecedf2] text-[#4f5870]",
  RESOLVED: "bg-[#e6efff] text-[#1f4c8f]",
  REJECTED: "bg-[#f6e9e9] text-[#8a3f3f]",
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

  const [item, setItem] = useState<LostFoundFeedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);

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

  const steps = useMemo(() => {
    if (!item) {
      return null;
    }

    return timelineState(item.status);
  }, [item]);

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-12">
        <div className="p-4 sm:p-6">
          <div className="h-12 w-32 animate-pulse rounded-full bg-muted" />
          <div className="mt-4 h-72 animate-pulse rounded-3xl bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-3xl bg-muted" />
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
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>

          <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-card sm:p-8">
            <h1 className="text-2xl font-bold text-foreground">
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
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>

          <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-card sm:p-8">
            <h1 className="text-2xl font-bold text-foreground">
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
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              href="/lost-found"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
              aria-label="Back to lost and found"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-extrabold text-primary sm:text-xl">
              Lost &amp; Found
            </h1>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Share item"
          >
            <Share2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      <section className="relative h-[240px] w-full overflow-hidden bg-muted sm:h-[300px]">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ece7f0] via-[#dfe7f5] to-[#ece7f0] text-[#4c5678]">
            <div className="text-center">
              <Camera className="mx-auto h-7 w-7" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em]">
                Image pending
              </p>
            </div>
          </div>
        )}

        <div className="absolute right-4 top-4">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.07em]",
              statusChipClassByStatus[item.status],
            )}
          >
            {statusLabelByStatus[item.status]}
          </span>
        </div>
      </section>

      <div className="relative -mt-5 space-y-4 px-4 sm:px-6">
        <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-[#1d2d56] sm:text-3xl">
              {item.title}
            </h2>
            <span className="shrink-0 rounded-xl bg-[#f2edf2] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-[#2f3c64]">
              {valueLabelByTier[item.valueTier]}
            </span>
          </div>

          <div className="space-y-2.5 text-sm text-[#4d5466]">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#6b7080]" />
              <span>{item.location}</span>
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#6b7080]" />
              <span>Reported on {formatDate(item.createdAt)}</span>
            </p>
            <p className="flex items-center gap-2">
              <User className="h-4 w-4 text-[#6b7080]" />
              <span>Reporter: {item.reporterName}</span>
            </p>
            <p className="flex items-center gap-2">
              <Info className="h-4 w-4 text-[#6b7080]" />
              <span>
                Claims: {item.claimSummary.totalClaims} total (
                {item.claimSummary.pendingClaims} pending)
              </span>
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-muted/60 p-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.07em] text-muted-foreground">
              Item Description
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {item.description}
            </p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground">
          <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
          <div className="relative z-10">
            <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Is this yours?
            </h3>
            <p className="mt-2 text-sm text-primary-foreground/85">
              If this item belongs to you, submit a claim and provide
              verification details.
            </p>
            <Button
              className="mt-5 h-12 w-full rounded-2xl bg-warning text-warning-foreground hover:bg-warning/90 disabled:bg-primary-foreground/20 disabled:text-primary-foreground/70"
              disabled={!canClaim(item.status)}
            >
              <ShieldCheck className="mr-2 h-5 w-5" />
              {claimButtonText(item.status)}
            </Button>
          </div>
        </section>

        {steps ? (
          <section className="rounded-3xl bg-card p-5 shadow-card sm:p-6">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.07em] text-muted-foreground">
              Status Timeline
            </h3>

            <TimelineRow
              title="Reported"
              subtitle={`${formatDate(item.createdAt)} • ${item.location}`}
              active={steps.reported}
              continuation
            />
            <TimelineRow
              title="Approved"
              subtitle="Awaiting ownership claim"
              active={steps.approved}
              continuation
            />
            <TimelineRow
              title="Claimed"
              subtitle="Ownership verification in progress"
              active={steps.claimed}
              continuation
            />
            <TimelineRow
              title="Resolved"
              subtitle="Item returned to owner"
              active={steps.resolved}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function TimelineRow({
  title,
  subtitle,
  active,
  continuation = false,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  continuation?: boolean;
}) {
  return (
    <div className="flex min-h-[68px] gap-4">
      <div className="flex flex-col items-center">
        <Circle
          className={cn(
            "h-3 w-3",
            active ? "fill-success text-success" : "fill-border text-border",
          )}
        />
        {continuation ? (
          <div
            className={cn(
              "h-full w-0.5",
              active ? "bg-success/30" : "bg-border",
            )}
          />
        ) : null}
      </div>

      <div className="pb-5">
        <p
          className={cn(
            "text-xl font-bold",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "text-sm",
            active ? "text-muted-foreground" : "italic text-muted-foreground",
          )}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
