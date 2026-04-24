"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Search,
  Plus,
  MapPin,
  CalendarDays,
  BellRing,
  Camera,
  UserRound,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createLostFoundItem,
  fetchLostFoundFeed,
  type LostFoundFeedItem,
  type LostFoundFeedStatus,
} from "@/lib/services/lost-found";
import { ApiFetchError } from "@/lib/fetch";

const statusConfig: Record<
  LostFoundFeedStatus,
  { label: string; badgeClassName: string; buttonText: string }
> = {
  PENDING: {
    label: "Pending",
    badgeClassName: "bg-muted/90 text-muted-foreground",
    buttonText: "Awaiting moderation",
  },
  APPROVED: {
    label: "Available",
    badgeClassName: "bg-warning/15 text-warning",
    buttonText: "This is mine",
  },
  CLAIMED: {
    label: "Claimed",
    badgeClassName: "bg-info/15 text-info",
    buttonText: "Claim in progress",
  },
  RESOLVED: {
    label: "Resolved",
    badgeClassName: "bg-primary/10 text-primary",
    buttonText: "Case closed",
  },
  REJECTED: {
    label: "Rejected",
    badgeClassName: "bg-destructive/10 text-destructive",
    buttonText: "Unavailable",
  },
};

const valueTierConfig: Record<
  LostFoundFeedItem["valueTier"],
  { label: string; className: string }
> = {
  LOW: {
    label: "LOW",
    className: "bg-success/20 text-success",
  },
  MEDIUM: {
    label: "MEDIUM",
    className: "bg-warning/20 text-warning",
  },
  HIGH: {
    label: "HIGH",
    className: "bg-destructive/20 text-destructive",
  },
  VERY_HIGH: {
    label: "VERY HIGH",
    className: "bg-destructive text-destructive-foreground",
  },
};

const filterOptions: Array<{
  value: "ALL" | LostFoundFeedStatus;
  label: string;
}> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Available" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
];

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

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return "unknown time";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "unknown time";
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}w ago`;
  }

  return formatDate(value);
}

function getCategory(item: LostFoundFeedItem) {
  const text = `${item.title} ${item.description}`.toLowerCase();

  if (
    text.includes("notebook") ||
    text.includes("id card") ||
    text.includes("student")
  ) {
    return "ACADEMIC";
  }

  if (
    text.includes("airpods") ||
    text.includes("laptop") ||
    text.includes("charger") ||
    text.includes("phone")
  ) {
    return "ELECTRONICS";
  }

  return "PERSONAL";
}

function isUrgent(item: LostFoundFeedItem) {
  return item.valueTier === "HIGH" || item.valueTier === "VERY_HIGH";
}

function canClaim(status: LostFoundFeedStatus) {
  return status === "APPROVED";
}

export default function LostFound() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | LostFoundFeedStatus>(
    "ALL",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [items, setItems] = useState<LostFoundFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLocation, setReportLocation] = useState("");
  const [reportValueTier, setReportValueTier] =
    useState<LostFoundFeedItem["valueTier"]>("MEDIUM");
  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    async function loadItems() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetchLostFoundFeed({ limit: 50 });
        if (!canceled) {
          setItems(response.items);
        }
      } catch (error) {
        if (!canceled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load lost and found feed";
          setLoadError(message);
          setItems([]);
        }
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      canceled = true;
    };
  }, []);

  function resetReportForm() {
    setReportTitle("");
    setReportDescription("");
    setReportLocation("");
    setReportValueTier("MEDIUM");
    setReportPhoto(null);
    setReportError(null);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);

    if (open) {
      setReportSuccess(null);
      setReportError(null);
    } else {
      setReportError(null);
    }
  }

  function handleReportPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setReportPhoto(file);

    if (file) {
      setReportError(null);
    }
  }

  async function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = reportTitle.trim();
    const normalizedDescription = reportDescription.trim();
    const normalizedLocation = reportLocation.trim();

    if (!normalizedTitle || !normalizedLocation) {
      setReportError("Please complete title and location before submitting.");
      return;
    }

    if (normalizedDescription.length < 10) {
      setReportError("Description must be at least 10 characters.");
      return;
    }

    if (!reportPhoto) {
      setReportError("Please upload a photo of the item.");
      return;
    }

    setIsSubmittingReport(true);
    setReportError(null);
    setReportSuccess(null);

    try {
      const createdItem = await createLostFoundItem({
        title: normalizedTitle,
        description: normalizedDescription,
        location: normalizedLocation,
        valueTier: reportValueTier,
        photo: reportPhoto,
      });

      setItems((current) => [
        createdItem,
        ...current.filter((item) => item.id !== createdItem.id),
      ]);
      setDialogOpen(false);
      resetReportForm();
      setReportSuccess(
        "Report submitted successfully and is now pending moderation.",
      );
    } catch (error) {
      if (
        error instanceof ApiFetchError &&
        (error.status === 401 || error.status === 403)
      ) {
        setReportError(
          "Your session has expired. Please sign in and try again.",
        );
      } else {
        setReportError(
          error instanceof Error
            ? error.message
            : "Unable to submit your report right now.",
        );
      }
    } finally {
      setIsSubmittingReport(false);
    }
  }

  const reportDescriptionLength = reportDescription.trim().length;
  const canSubmitReport =
    !isSubmittingReport &&
    reportTitle.trim().length > 0 &&
    reportLocation.trim().length > 0 &&
    reportDescriptionLength >= 10 &&
    reportPhoto !== null;

  const statusCounts = useMemo(
    () => ({
      ALL: items.length,
      PENDING: items.filter((item) => item.status === "PENDING").length,
      APPROVED: items.filter((item) => item.status === "APPROVED").length,
      CLAIMED: items.filter((item) => item.status === "CLAIMED").length,
      RESOLVED: items.filter((item) => item.status === "RESOLVED").length,
      REJECTED: items.filter((item) => item.status === "REJECTED").length,
    }),
    [items],
  );

  const visibleFilterOptions = useMemo(
    () =>
      filterOptions.filter(
        (option) => option.value === "ALL" || statusCounts[option.value] > 0,
      ),
    [statusCounts],
  );

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const normalizedSearch = search.trim().toLowerCase();
        const matchesSearch =
          normalizedSearch.length === 0 ||
          item.title.toLowerCase().includes(normalizedSearch) ||
          item.location.toLowerCase().includes(normalizedSearch) ||
          item.description.toLowerCase().includes(normalizedSearch) ||
          item.reporterName.toLowerCase().includes(normalizedSearch);

        const matchesStatus =
          filterStatus === "ALL" || item.status === filterStatus;
        return matchesSearch && matchesStatus;
      }),
    [items, search, filterStatus],
  );

  return (
    <AppLayout>
      <section className="space-y-5">

        {/* Page header */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                Lost &amp; Found
              </h1>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Browse community reports and claim what belongs to you.
              </p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
                {isLoading
                  ? "Loading reports…"
                  : `${items.length} item${items.length !== 1 ? "s" : ""} in feed`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/lost-found/my-items"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <UserRound className="h-4 w-4" />
                Mine
              </Link>

              <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button className="h-10 rounded-xl px-4 text-sm font-bold">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Report
                  </Button>
                </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Report a Found Item</DialogTitle>
                </DialogHeader>
                <form className="space-y-4 pt-2" onSubmit={handleReportSubmit}>
                  <div>
                    <Label htmlFor="report-item-title">Item Title</Label>
                    <Input
                      id="report-item-title"
                      placeholder="e.g., Blue Water Bottle"
                      className="mt-1.5 rounded-xl"
                      value={reportTitle}
                      onChange={(event) => setReportTitle(event.target.value)}
                      disabled={isSubmittingReport}
                    />
                  </div>
                  <div>
                    <Label htmlFor="report-item-description">Description</Label>
                    <Textarea
                      id="report-item-description"
                      placeholder="Describe the item in detail…"
                      className="mt-1.5 rounded-xl"
                      rows={3}
                      value={reportDescription}
                      onChange={(event) =>
                        setReportDescription(event.target.value)
                      }
                      disabled={isSubmittingReport}
                    />
                    <p
                      className={cn(
                        "mt-1 text-[11px]",
                        reportDescriptionLength >= 10
                          ? "text-success"
                          : "text-muted-foreground",
                      )}
                    >
                      {reportDescriptionLength}/10+ characters
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="report-item-location">Location Found</Label>
                      <Input
                        id="report-item-location"
                        placeholder="e.g., Library 2F"
                        className="mt-1.5 rounded-xl"
                        value={reportLocation}
                        onChange={(event) =>
                          setReportLocation(event.target.value)
                        }
                        disabled={isSubmittingReport}
                      />
                    </div>
                    <div>
                      <Label>Value Tier</Label>
                      <Select
                        value={reportValueTier}
                        onValueChange={(value) =>
                          setReportValueTier(
                            value as LostFoundFeedItem["valueTier"],
                          )
                        }
                        disabled={isSubmittingReport}
                      >
                        <SelectTrigger className="mt-1.5 rounded-xl">
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low Value</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="VERY_HIGH">Very High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="report-item-photo">Photo</Label>
                    <Input
                      id="report-item-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      className="sr-only"
                      onChange={handleReportPhotoChange}
                      disabled={isSubmittingReport}
                    />
                    <label
                      htmlFor="report-item-photo"
                      className={cn(
                        "mt-1.5 flex h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors",
                        reportPhoto
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-surface hover:bg-muted",
                      )}
                    >
                      <div className="flex flex-col items-center gap-1.5 px-3 text-center">
                        <Camera
                          className={cn(
                            "h-5 w-5",
                            reportPhoto ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            reportPhoto ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {reportPhoto
                            ? reportPhoto.name
                            : "Click to upload photo"}
                        </span>
                        {reportPhoto ? (
                          <span className="text-[11px] text-muted-foreground">
                            {(reportPhoto.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            JPEG, PNG or WebP · max 5 MB
                          </span>
                        )}
                      </div>
                    </label>
                  </div>

                  {reportError ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                      {reportError}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl"
                    disabled={!canSubmitReport}
                  >
                    {isSubmittingReport ? "Submitting…" : "Submit Report"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items, locations, or reporters…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-xl border-border/70  pl-10 text-sm"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {visibleFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                    filterStatus === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                  )}
                >
                  {option.label}
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      filterStatus === option.value
                        ? "bg-white/20"
                        : "bg-muted",
                    )}
                  >
                    {statusCounts[option.value]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {loadError ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        {reportSuccess ? (
          <div className="rounded-2xl border border-success/25 bg-success/5 px-4 py-3 text-sm text-success">
            {reportSuccess}
          </div>
        ) : null}

        {/* Item Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card"
              >
                <div className="h-44 animate-pulse bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded-lg bg-muted" />
                  <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-16 text-center shadow-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">
              No matching items
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different keyword or clear the filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const category = getCategory(item);
              const claimable = canClaim(item.status);
              const isDimmed =
                item.status === "CLAIMED" || item.status === "RESOLVED";

              return (
                <article
                  key={item.id}
                  className={cn(
                    "group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover",
                    isDimmed && "opacity-75",
                  )}
                >
                  {/* Image section */}
                  <Link href={`/lost-found/${item.id}`} className="block">
                    <div className="relative h-44 overflow-hidden">
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photoUrl}
                          alt={item.title}
                          className={cn(
                            "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
                            isDimmed && "grayscale",
                          )}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent via-muted to-accent">
                          <div className="text-center">
                            <Camera className="mx-auto h-6 w-6 text-muted-foreground" />
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                              No photo
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Gradient overlay for readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                      {/* Top badges */}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] backdrop-blur-sm",
                              valueTierConfig[item.valueTier].className,
                            )}
                          >
                            {valueTierConfig[item.valueTier].label}
                          </span>
                          <span className="rounded-full bg-background/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-foreground backdrop-blur-sm">
                            {category}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] backdrop-blur-sm",
                            statusConfig[item.status].badgeClassName,
                          )}
                        >
                          {statusConfig[item.status].label}
                        </span>
                      </div>

                      {/* Urgent indicator */}
                      {isUrgent(item) && (
                        <div className="absolute bottom-2.5 left-2.5">
                          <span className="rounded-full bg-destructive/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-destructive-foreground backdrop-blur-sm">
                            Urgent
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="line-clamp-1 text-[1.05rem] font-bold text-foreground mb-3">
                      {item.title}
                    </h3>

                    <div className="space-y-1.5 text-[11px] text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="line-clamp-1">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {formatDate(item.createdAt)} · {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserRound className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="line-clamp-1">{item.reporterName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {item.claimSummary.totalClaims} claim{item.claimSummary.totalClaims !== 1 ? "s" : ""}
                          {item.claimSummary.pendingClaims > 0 && (
                            <span className="ml-1 font-semibold text-warning">
                              ({item.claimSummary.pendingClaims} pending)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <Link href={`/lost-found/${item.id}`} className="block">
                      <Button
                        variant={claimable ? "default" : "secondary"}
                        className={cn(
                          "h-10 w-full rounded-xl text-sm font-bold",
                          !claimable && "opacity-60",
                        )}
                        disabled={!claimable}
                      >
                        {statusConfig[item.status].buttonText}
                      </Button>
                    </Link>
                  </div>
                </article>
              );
            })}

            {/* Can't find it card */}
            <aside className="relative flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/60 p-6 text-center md:min-h-[280px]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <BellRing className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Can&apos;t find it?
              </h3>
              <p className="mt-2 max-w-[200px] text-sm leading-relaxed text-muted-foreground">
                Set up an alert and we&apos;ll notify you when similar items appear.
              </p>
              <button className="mt-5 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary/10">
                Create Alert
              </button>
            </aside>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
