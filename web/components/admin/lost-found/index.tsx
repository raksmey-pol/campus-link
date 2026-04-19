"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { moderationQueue } from "@/components/admin/mock-data";
import type { BackendClaim, ModerationCase, ModerationStatus } from "@/components/admin/types";
import {
  fetchItemClaims,
  fetchModerationCaseById,
  fetchModerationCases,
  patchClaimStatus,
  patchModerationCaseStatus,
  resolveItem,
} from "@/lib/services/lost-found";
import { BulkActionBar } from "./BulkActionBar";
import { CaseDetailPanel } from "./CaseDetailPanel";
import { CaseTable } from "./CaseTable";
import { FilterBar, type LostFoundTab } from "./FilterBar";

const TABS = ["Claim Requests", "Pending", "Approved", "Claimed", "Rejected", "All"] as const satisfies readonly LostFoundTab[];
const PAGE_SIZE_OPTIONS = [5, 10, 15] as const;
const ACTION_ERROR_AUTO_DISMISS_MS = 5000;

export function LostFoundWorkspace() {
  const [items, setItems] = useState<ModerationCase[]>([]);
  const [activeTab, setActiveTab] = useState<LostFoundTab>("Pending");
  const [query, setQuery] = useState("");
  const [highValueOnly, setHighValueOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Claims for the active case (APPROVED or CLAIMED items)
  const [activeCaseClaims, setActiveCaseClaims] = useState<BackendClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  // ── Load initial queue ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const remote = await fetchModerationCases();
        if (!cancelled) setItems(remote);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load moderation queue");
          setItems([...moderationQueue]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // ── Auto-dismiss action errors ──────────────────────────────────────────────
  useEffect(() => {
    if (!actionError) return;
    const id = window.setTimeout(() => setActionError(null), ACTION_ERROR_AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [actionError]);

  // ── Filtering & pagination ──────────────────────────────────────────────────
  const claimRequestCount = useMemo(
    () => items.filter((item) => (item.claimSummary?.pendingClaims ?? 0) > 0).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchingItems = items.filter((item) => {
      const hasPendingClaims = (item.claimSummary?.pendingClaims ?? 0) > 0;
      const matchesTab =
        activeTab === "All"
          ? true
          : activeTab === "Claim Requests"
          ? hasPendingClaims
          : item.status === activeTab;
      const matchesQuery =
        !normalizedQuery ||
        item.id.toLowerCase().includes(normalizedQuery) ||
        item.item.toLowerCase().includes(normalizedQuery) ||
        item.reporter.toLowerCase().includes(normalizedQuery);
      const matchesTier = !highValueOnly || item.tier.toLowerCase().includes("high");
      return matchesTab && matchesQuery && matchesTier;
    });

    if (activeTab !== "Claim Requests") {
      return matchingItems;
    }

    return [...matchingItems].sort((a, b) => {
      const pendingA = a.claimSummary?.pendingClaims ?? 0;
      const pendingB = b.claimSummary?.pendingClaims ?? 0;
      if (pendingA !== pendingB) return pendingB - pendingA;
      return Number(b.id) - Number(a.id);
    });
  }, [items, activeTab, query, highValueOnly]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => { setCurrentPage(1); }, [activeTab, query, highValueOnly, pageSize]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalItems);
  const visibleIds = paginatedItems.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const activeCase = useMemo(
    () => items.find((item) => item.id === activeCaseId) ?? null,
    [items, activeCaseId],
  );

  const tabCounts = useMemo<Record<LostFoundTab, number>>(() => ({
    All: items.length,
    "Claim Requests": claimRequestCount,
    Pending: items.filter((i) => i.status === "Pending").length,
    Approved: items.filter((i) => i.status === "Approved").length,
    Claimed: items.filter((i) => i.status === "Claimed").length,
    Resolved: items.filter((i) => i.status === "Resolved").length,
    Rejected: items.filter((i) => i.status === "Rejected").length,
  }), [items, claimRequestCount]);

  // ── Selection ───────────────────────────────────────────────────────────────
  const toggleCaseSelection = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id));
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  // ── Item moderation ─────────────────────────────────────────────────────────
  const updateItemStatuses = async (ids: string[], status: ModerationStatus): Promise<boolean> => {
    if (!ids.length || status === "Pending" || status === "Claimed" || status === "Resolved") return false;
    setActionError(null);
    const rejectionReason = moderationReason.trim();
    try {
      await Promise.all(
        ids.map((id) => patchModerationCaseStatus(
          id,
          status as Extract<ModerationStatus, "Approved" | "Rejected">,
          status === "Rejected" ? rejectionReason : undefined,
        )),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update status");
      return false;
    }
    setItems((prev) => prev.map((item) => ids.includes(item.id) ? { ...item, status } : item));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    return true;
  };

  const handleReviewItemAction = async (id: string, status: Extract<ModerationStatus, "Approved" | "Rejected">) => {
    if (status === "Rejected" && !moderationReason.trim()) {
      setActionError("Moderation Reason is required before rejecting a case");
      return;
    }
    const success = await updateItemStatuses([id], status);
    if (success) {
      setActiveCaseId(null);
      setModerationReason("");
    }
  };

  // ── Open case review ────────────────────────────────────────────────────────
  const openCaseReview = async (id: string) => {
    setActiveCaseId(id);
    setModerationReason("");
    setActionError(null);
    setActiveCaseClaims([]);

    try {
      const detail = await fetchModerationCaseById(id);
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...detail } : item));

      // Fetch claims for APPROVED and CLAIMED items
      if (detail.status === "Approved" || detail.status === "Claimed") {
        setClaimsLoading(true);
        try {
          const claims = await fetchItemClaims(id);
          setActiveCaseClaims(claims);
        } catch {
          // Non-fatal: claims panel shows empty state
        } finally {
          setClaimsLoading(false);
        }
      }
    } catch {
      // Keep existing list data if detail fetch fails
    }
  };

  // ── Claim actions ───────────────────────────────────────────────────────────
  const handleApproveClaim = async (claimId: number) => {
    if (!activeCaseId) return;
    setActionError(null);
    try {
      await patchClaimStatus(activeCaseId, claimId, "APPROVED");
      // Item transitions to CLAIMED — refresh detail
      const updated = await fetchModerationCaseById(activeCaseId);
      setItems((prev) => prev.map((item) => item.id === activeCaseId ? { ...item, ...updated } : item));
      setActiveCaseClaims((prev) =>
        prev.map((c) => c.id === claimId ? { ...c, status: "APPROVED" as const } : { ...c, status: "REJECTED" as const }),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to approve claim");
    }
  };

  const handleRejectClaim = async (claimId: number, reason: string) => {
    if (!activeCaseId) return;
    setActionError(null);
    try {
      await patchClaimStatus(activeCaseId, claimId, "REJECTED", reason);
      setActiveCaseClaims((prev) =>
        prev.map((c) => c.id === claimId ? { ...c, status: "REJECTED" as const, rejection_reason: reason } : c),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to reject claim");
    }
  };

  // ── Force resolve ───────────────────────────────────────────────────────────
  const handleForceResolve = async () => {
    if (!activeCaseId) return;
    setActionError(null);
    try {
      await resolveItem(activeCaseId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === activeCaseId
            ? { ...item, status: "Resolved" as const, resolveState: { isResolved: true, finderConfirmed: true, claimerConfirmed: true, resolvedAt: new Date().toISOString() } }
            : item,
        ),
      );
      setActiveCaseId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to resolve item");
    }
  };

  return (
    <AdminShell active="lost-found" title="Lost & Found — Moderation Queue">
      <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col gap-4">
        <FilterBar
          tabs={TABS}
          activeTab={activeTab}
          onTabChangeAction={setActiveTab}
          tabCounts={tabCounts}
          query={query}
          onQueryChangeAction={setQuery}
          highValueOnly={highValueOnly}
          onHighValueOnlyChangeAction={setHighValueOnly}
        />

        {claimRequestCount > 0 && activeTab !== "Claim Requests" && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-warning">
              <BellRing className="h-3.5 w-3.5" />
              <p className="font-semibold">
                {claimRequestCount} item{claimRequestCount > 1 ? "s have" : " has"} pending claim submission review.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-md bg-warning px-3 text-xs text-warning-foreground hover:bg-warning/90"
              onClick={() => setActiveTab("Claim Requests")}
            >
              Review Claim Requests
            </Button>
          </div>
        )}

        {loadError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {loadError}
          </div>
        )}

        {!activeCase && actionError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {actionError}
          </div>
        )}

        <section className={cn("min-h-0 flex-1 grid grid-cols-1 gap-4", activeCase && "xl:grid-cols-[minmax(0,1fr)_22rem]")}>
          <CaseTable
            items={paginatedItems}
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onPageChangeAction={setCurrentPage}
            onPageSizeChangeAction={setPageSize}
            selectedIds={selectedIds}
            allVisibleSelected={allVisibleSelected}
            activeCaseId={activeCaseId}
            onToggleSelectAction={toggleCaseSelection}
            onToggleSelectAllAction={toggleSelectAllVisible}
            onOpenCaseAction={openCaseReview}
            isLoading={isLoading}
          />

          {activeCase && (
            <CaseDetailPanel
              caseItem={activeCase}
              claims={activeCaseClaims}
              claimsLoading={claimsLoading}
              moderationReason={moderationReason}
              errorMessage={actionError}
              onModerationReasonChange={setModerationReason}
              onApproveItem={() => void handleReviewItemAction(activeCase.id, "Approved")}
              onRejectItem={() => void handleReviewItemAction(activeCase.id, "Rejected")}
              onApproveClaim={handleApproveClaim}
              onRejectClaim={handleRejectClaim}
              onForceResolve={handleForceResolve}
              onClose={() => setActiveCaseId(null)}
            />
          )}
        </section>

        <BulkActionBar
          selectedCount={selectedIds.length}
          onApproveSelected={() => void updateItemStatuses(selectedIds, "Approved")}
          onRejectSelected={() => void updateItemStatuses(selectedIds, "Rejected")}
        />
      </div>
    </AdminShell>
  );
}
