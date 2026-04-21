"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Mail,
  User,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import type { AuthUserProfile } from "@/lib/bff/auth";
import {
  USER_POINT_TYPE_OPTIONS,
  fetchMyPointHistory,
  type UserPointHistoryEntry,
  type UserPointType,
} from "@/lib/services/user-points";
import { cn } from "@/lib/utils";

type AuthMeResponse = {
  success?: boolean;
  user?: AuthUserProfile;
};

type SelectedFilterType = UserPointType | "ALL";

const pointTypeLabelByValue = USER_POINT_TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<SelectedFilterType, string>,
);

function formatHistoryDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<AuthUserProfile | null>(null);
  const [selectedType, setSelectedType] = useState<SelectedFilterType>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [historyRows, setHistoryRows] = useState<UserPointHistoryEntry[]>([]);
  const [civicPoints, setCivicPoints] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (isMounted) {
            setUserProfile(null);
          }
          return;
        }

        const payload = (await response
          .json()
          .catch(() => null)) as AuthMeResponse | null;

        if (isMounted) {
          setUserProfile(payload?.user ?? null);
        }
      } catch {
        if (isMounted) {
          setUserProfile(null);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPointHistory() {
      setIsLoadingHistory(true);
      setHistoryError(null);

      try {
        const history = await fetchMyPointHistory({
          page: currentPage,
          limit: 10,
          type: selectedType,
        });

        if (!isMounted) {
          return;
        }

        setHistoryRows(history.transactions);
        setCivicPoints(history.civicPoints);
        setTotalRows(history.pagination.total);
        setTotalPages(history.pagination.totalPages);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setHistoryRows([]);
        setTotalRows(0);
        setTotalPages(1);
        setHistoryError(
          error instanceof Error
            ? error.message
            : "Unable to load point history right now.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadPointHistory();

    return () => {
      isMounted = false;
    };
  }, [currentPage, selectedType]);

  const displayName = userProfile?.displayName ?? "CampusLink User";
  const email = userProfile?.email ?? "Not signed in";

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const activitySummary = useMemo(() => {
    const positiveCount = historyRows.filter((entry) => entry.amount > 0).length;
    const negativeCount = historyRows.filter((entry) => entry.amount < 0).length;

    return {
      positiveCount,
      negativeCount,
    };
  }, [historyRows]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Review your account details and full civic point history.
          </p>
        </div>

        <section className="rounded-2xl bg-card shadow-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-foreground">{displayName}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{email}</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-warning/10 px-4 py-3 text-warning">
              <p className="text-xs font-semibold uppercase tracking-wide">Civic Points</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
                <Award className="h-5 w-5" />
                <span>{civicPoints.toLocaleString()}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card shadow-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Point History</h2>
              <p className="text-xs text-muted-foreground">
                {totalRows.toLocaleString()} total transaction{totalRows === 1 ? "" : "s"}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Type</span>
              <select
                value={selectedType}
                onChange={(event) => {
                  const nextType = event.target.value as SelectedFilterType;
                  setSelectedType(nextType);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                {USER_POINT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {historyError ? (
            <div className="px-4 py-5 text-sm text-destructive">{historyError}</div>
          ) : isLoadingHistory ? (
            <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading point history...</span>
            </div>
          ) : historyRows.length === 0 ? (
            <div className="px-4 py-5 text-sm text-muted-foreground">
              No point activity found for this filter.
            </div>
          ) : (
            <div>
              {historyRows.map((entry, index) => {
                const isPositive = entry.amount >= 0;
                const amountText = `${isPositive ? "+" : ""}${entry.amount}`;
                const typeLabel =
                  pointTypeLabelByValue[entry.type as SelectedFilterType] ??
                  entry.type;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      index < historyRows.length - 1 && "border-b border-border",
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Award className="h-4 w-4 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{typeLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatHistoryDate(entry.createdAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-bold",
                          isPositive ? "text-success" : "text-destructive",
                        )}
                      >
                        {amountText}
                      </p>
                      {entry.referenceType && entry.referenceId ? (
                        <p className="text-[11px] text-muted-foreground">
                          {entry.referenceType} #{entry.referenceId}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="text-success">
                +{activitySummary.positiveCount} gain entries on this page
              </span>
              {activitySummary.negativeCount > 0 ? (
                <span className="text-destructive">
                  {activitySummary.negativeCount} deduction entries on this page
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                disabled={!canGoPrev || isLoadingHistory}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={!canGoNext || isLoadingHistory}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
