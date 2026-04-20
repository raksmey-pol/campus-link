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
  Info,
  BellRing,
  Camera,
  UserRound,
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
    label: "Pending Verification",
    badgeClassName: "bg-[#fef4f4] text-[#7b2030]",
    buttonText: "Awaiting moderation",
  },
  APPROVED: {
    label: "Available to Claim",
    badgeClassName: "bg-[#f8edd8] text-[#895f1e]",
    buttonText: "This is mine",
  },
  CLAIMED: {
    label: "Claim in Progress",
    badgeClassName: "bg-[#ecedf2] text-[#4f5870]",
    buttonText: "Claim in progress",
  },
  RESOLVED: {
    label: "Resolved",
    badgeClassName: "bg-[#e6efff] text-[#1f4c8f]",
    buttonText: "Case closed",
  },
  REJECTED: {
    label: "Not Public",
    badgeClassName: "bg-[#f6e9e9] text-[#8a3f3f]",
    buttonText: "Unavailable",
  },
};

const valueTierConfig: Record<
  LostFoundFeedItem["valueTier"],
  { label: string; className: string }
> = {
  LOW: {
    label: "LOW VALUE",
    className: "bg-[#e4efe6] text-[#2e5a39]",
  },
  MEDIUM: {
    label: "STANDARD VALUE",
    className: "bg-[#efe4c9] text-[#735117]",
  },
  HIGH: {
    label: "HIGH VALUE",
    className: "bg-[#f6d7d8] text-[#8e1f2d]",
  },
  VERY_HIGH: {
    label: "VERY HIGH VALUE",
    className: "bg-[#dc3545] text-white",
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
      <section className="space-y-6">
        <div className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-card sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Lost and Found Board
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse real reports from the community and claim what belongs to
                you.
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em] text-[#4d5466]">
                {isLoading
                  ? "Loading reports..."
                  : `${items.length} items currently in feed`}
              </p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl px-4 text-sm font-semibold shadow-fab">
                  <Plus className="mr-1.5 h-4.5 w-4.5" />
                  Report Item
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
                      placeholder="Describe the item..."
                      className="mt-1.5 rounded-xl"
                      rows={3}
                      value={reportDescription}
                      onChange={(event) =>
                        setReportDescription(event.target.value)
                      }
                      disabled={isSubmittingReport}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {reportDescriptionLength}/10+ characters
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="report-item-location">
                        Location Found
                      </Label>
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
                      className="mt-1.5 flex h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <div className="flex flex-col items-center gap-1 px-3 text-center">
                        <Camera className="h-5 w-5" />
                        <span className="text-xs font-medium">
                          {reportPhoto
                            ? `Selected: ${reportPhoto.name}`
                            : "Click to upload photo"}
                        </span>
                        {reportPhoto ? (
                          <span className="text-[11px] text-muted-foreground/80">
                            {(reportPhoto.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        ) : null}
                      </div>
                    </label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      JPEG, PNG, JPG, or WebP. Maximum 5 MB.
                    </p>
                  </div>

                  {reportError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      {reportError}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl"
                    disabled={!canSubmitReport}
                  >
                    {isSubmittingReport ? "Submitting..." : "Submit Report"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items, descriptions, or location"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 rounded-xl border-border/80 bg-background/60 pl-11"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar lg:max-w-[55%]">
              {visibleFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                    filterStatus === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label} ({statusCounts[option.value]})
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        {reportSuccess ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {reportSuccess}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-card"
              >
                <div className="h-40 animate-pulse bg-muted sm:h-44" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-card py-16 text-center shadow-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              No matching items found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different keyword or clear filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const category = getCategory(item);
              const claimable = canClaim(item.status);

              return (
                <article
                  key={item.id}
                  className={cn(
                    "group overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover",
                    (item.status === "CLAIMED" || item.status === "RESOLVED") &&
                      "bg-muted/35",
                  )}
                >
                  <Link href={`/lost-found/${item.id}`} className="block">
                    <div className="relative h-40 overflow-hidden sm:h-44">
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photoUrl}
                          alt={item.title}
                          className={cn(
                            "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
                            (item.status === "CLAIMED" ||
                              item.status === "RESOLVED") &&
                              "grayscale",
                          )}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ece7f0] via-[#dfe7f5] to-[#ece7f0] text-[#4c5678]">
                          <div className="text-center">
                            <Camera className="mx-auto h-6 w-6" />
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em]">
                              Image pending
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em]",
                              valueTierConfig[item.valueTier].className,
                            )}
                          >
                            {valueTierConfig[item.valueTier].label}
                          </span>
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#2a3554]">
                            {category}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em]",
                            statusConfig[item.status].badgeClassName,
                          )}
                        >
                          {statusConfig[item.status].label}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-1 text-[1.08rem] font-bold text-[#1d2d56]">
                        {item.title}
                      </h3>
                      {isUrgent(item) ? (
                        <span className="pt-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#ca2d2d]">
                          URGENT
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2 text-xs text-[#4d5466]">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#6b7080]" />
                        <span className="line-clamp-1">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-[#6b7080]" />
                        <span>
                          Reported: {formatDate(item.createdAt)} (
                          {formatRelativeTime(item.createdAt)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserRound className="h-3.5 w-3.5 text-[#6b7080]" />
                        <span className="line-clamp-1">
                          Reporter: {item.reporterName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-[#6b7080]" />
                        <span>
                          Claims:{" "}
                          <span className="font-semibold">
                            {item.claimSummary.totalClaims}
                          </span>
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/lost-found/${item.id}`}
                      className="block pt-1"
                    >
                      <Button
                        variant="secondary"
                        className="h-10 w-full rounded-none bg-[#f2edf2] text-sm font-bold text-[#1e2a56] hover:bg-[#ece2ea] disabled:bg-muted disabled:text-muted-foreground"
                        disabled={!claimable}
                      >
                        {statusConfig[item.status].buttonText}
                      </Button>
                    </Link>
                  </div>
                </article>
              );
            })}

            <aside className="relative flex min-h-[380px] flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#b7b3bf] bg-[#f8f6fb] p-6 text-center md:min-h-[300px]">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#ebe7f1] text-[#1f2b5b]">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-[#1f2b5b]">
                Can&apos;t find it?
              </h3>
              <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-[#5b6175]">
                Set up a lost item alert and we&apos;ll notify you once similar
                reports come in.
              </p>
              <button className="mt-6 text-xs font-extrabold uppercase tracking-[0.08em] text-[#203f9e] underline decoration-2 underline-offset-4">
                Create Alert
              </button>

              <div className="pointer-events-none absolute right-4 top-4 hidden rounded-xl border border-border/70 bg-card/95 px-3 py-2 text-[11px] font-semibold text-[#1f2b5b] shadow-card lg:flex lg:items-center lg:gap-2">
                <BellRing className="h-3.5 w-3.5 text-[#203f9e]" />
                Hotspots near you
              </div>
            </aside>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
