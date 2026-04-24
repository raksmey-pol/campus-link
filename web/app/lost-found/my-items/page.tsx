"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  XCircle,
} from "lucide-react";
import { ApiFetchError } from "@/lib/fetch";
import {
  fetchMyActivity,
  type MyActivityReportedItem,
  type MyActivitySubmittedClaim,
  type LostFoundFeedStatus,
  type LostFoundValueTier,
} from "@/lib/services/lost-found";
import { cn } from "@/lib/utils";

const statusLabel: Record<LostFoundFeedStatus, string> = {
  PENDING: "Pending Review",
  APPROVED: "Available",
  CLAIMED: "Claim in Progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

const statusBadge: Record<LostFoundFeedStatus, string> = {
  PENDING: "bg-muted/80 text-muted-foreground",
  APPROVED: "bg-warning/15 text-warning",
  CLAIMED: "bg-info/15 text-info",
  RESOLVED: "bg-primary/10 text-primary",
  REJECTED: "bg-destructive/10 text-destructive",
};

const claimStatusLabel: Record<string, string> = {
  PENDING: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const claimStatusBadge: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
};

const valueTierBadge: Record<LostFoundValueTier, string> = {
  LOW: "bg-success/10 text-success",
  MEDIUM: "bg-warning/10 text-warning",
  HIGH: "bg-destructive/10 text-destructive",
  VERY_HIGH: "bg-destructive text-destructive-foreground",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function ItemPhoto({ url, title }: { url: string | null; title: string }) {
  return (
    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Camera className="h-5 w-5 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}

export default function MyItemsPage() {
  const [reportedItems, setReportedItems] = useState<MyActivityReportedItem[]>([]);
  const [submittedClaims, setSubmittedClaims] = useState<MyActivitySubmittedClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"found" | "claims">("found");

  useEffect(() => {
    let canceled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchMyActivity();
        if (!canceled) {
          setReportedItems(data.reportedItems);
          setSubmittedClaims(data.submittedClaims);
        }
      } catch (error) {
        if (canceled) return;
        if (
          error instanceof ApiFetchError &&
          (error.status === 401 || error.status === 403)
        ) {
          setRequiresLogin(true);
        } else {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load your activity.",
          );
        }
      } finally {
        if (!canceled) setIsLoading(false);
      }
    }

    void load();
    return () => { canceled = true; };
  }, []);

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-12">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="h-9 w-28 animate-pulse rounded-full bg-muted" />
          <div className="h-12 animate-pulse rounded-2xl bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  if (requiresLogin) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-12">
        <div className="p-4 sm:p-6">
          <BackLink />
          <section className="mt-6 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <p className="text-base font-semibold text-foreground">Sign in to view your activity</p>
            <p className="mt-1 text-sm text-muted-foreground">Your reported items and claims are only visible when logged in.</p>
            <Link href="/login" className="mt-4 inline-block">
              <button className="h-10 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                Go to Login
              </button>
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-background pb-12">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <Link
            href="/lost-found"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
            aria-label="Back to lost and found"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="text-base font-bold text-foreground">My Activity</h1>
        </div>
      </header>

      <div className="px-4 pt-4 sm:px-6 space-y-4">
        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          <TabButton
            label={`Items I Found (${reportedItems.length})`}
            active={activeTab === "found"}
            onClick={() => setActiveTab("found")}
          />
          <TabButton
            label={`My Claims (${submittedClaims.length})`}
            active={activeTab === "claims"}
            onClick={() => setActiveTab("claims")}
          />
        </div>

        {activeTab === "found" ? (
          reportedItems.length === 0 ? (
            <EmptyState
              icon={<Camera className="h-8 w-8 text-muted-foreground/50" />}
              title="No items reported yet"
              description="Items you report as found will appear here."
            />
          ) : (
            <div className="space-y-3">
              {reportedItems.map((item) => (
                <ReportedItemCard key={item.id} item={item} />
              ))}
            </div>
          )
        ) : (
          submittedClaims.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8 text-muted-foreground/50" />}
              title="No claims submitted yet"
              description="Claims you submit on found items will appear here."
            />
          ) : (
            <div className="space-y-3">
              {submittedClaims.map((claim) => (
                <SubmittedClaimCard key={claim.id} claim={claim} />
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/lost-found"
      className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Link>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ReportedItemCard({ item }: { item: MyActivityReportedItem }) {
  return (
    <Link href={`/lost-found/${item.id}`} className="block">
      <div className="flex gap-3 rounded-2xl bg-card p-4 shadow-card transition-colors hover:bg-accent/40">
        <ItemPhoto url={item.photoUrl} title={item.title} />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
            <span
              className={cn(
                "flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                statusBadge[item.status],
              )}
            >
              {statusLabel[item.status]}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{item.location}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(item.createdAt)}</span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {item.claimSummary.totalClaims} claim{item.claimSummary.totalClaims !== 1 ? "s" : ""}
              {item.claimSummary.pendingClaims > 0 ? (
                <span className="text-warning font-semibold">
                  ({item.claimSummary.pendingClaims} pending)
                </span>
              ) : null}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                valueTierBadge[item.valueTier],
              )}
            >
              {item.valueTier.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SubmittedClaimCard({ claim }: { claim: MyActivitySubmittedClaim }) {
  return (
    <Link href={`/lost-found/${claim.item.id}`} className="block">
      <div className="rounded-2xl bg-card p-4 shadow-card transition-colors hover:bg-accent/40 space-y-3">
        {/* Item row */}
        <div className="flex gap-3">
          <ItemPhoto url={claim.item.photoUrl} title={claim.item.title} />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-bold text-foreground">{claim.item.title}</p>
              <span
                className={cn(
                  "flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  claimStatusBadge[claim.status] ?? "bg-muted text-muted-foreground",
                )}
              >
                {claimStatusLabel[claim.status] ?? claim.status}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{claim.item.location}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Claimed {formatDate(claim.createdAt)}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                  statusBadge[claim.item.status],
                )}
              >
                {statusLabel[claim.item.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Status details */}
        {claim.status === "APPROVED" ? (
          <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/5 px-3 py-2 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Your claim was approved. Go to the item page to confirm handoff.</span>
          </div>
        ) : claim.status === "REJECTED" ? (
          <div className="space-y-1 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Claim rejected{claim.reviewedAt ? ` on ${formatDate(claim.reviewedAt)}` : ""}.</span>
            </div>
            {claim.rejectionReason ? (
              <p className="pl-5 text-destructive/80">{claim.rejectionReason}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-warning">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Under review by the finder.</span>
          </div>
        )}
      </div>
    </Link>
  );
}
