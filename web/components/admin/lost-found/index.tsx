"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/AdminShell";
import { moderationQueue } from "@/components/admin/mock-data";
import type { ModerationCase, ModerationStatus } from "@/components/admin/types";
import { fetchModerationCaseById, fetchModerationCases, patchModerationCaseStatus } from "@/lib/services/lost-found";
import { BulkActionBar } from "./BulkActionBar";
import { CaseDetailPanel } from "./CaseDetailPanel";
import { CaseTable } from "./CaseTable";
import { FilterBar, type LostFoundTab } from "./FilterBar";

const TABS = ["Pending", "Approved", "Rejected", "All"] as const satisfies readonly LostFoundTab[];
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

  // Load cases on mount
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

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTab = activeTab === "All" || item.status === activeTab;
      const matchesQuery =
        !normalizedQuery ||
        item.id.toLowerCase().includes(normalizedQuery) ||
        item.item.toLowerCase().includes(normalizedQuery) ||
        item.reporter.toLowerCase().includes(normalizedQuery);
      const matchesTier = !highValueOnly || item.tier.toLowerCase().includes("high");
      return matchesTab && matchesQuery && matchesTier;
    });
  }, [items, activeTab, query, highValueOnly]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => { setCurrentPage(1); }, [activeTab, query, highValueOnly, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!actionError) return;
    const timeoutId = window.setTimeout(() => setActionError(null), ACTION_ERROR_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [actionError]);

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
    Pending: items.filter((i) => i.status === "Pending").length,
    Approved: items.filter((i) => i.status === "Approved").length,
    Rejected: items.filter((i) => i.status === "Rejected").length,
  }), [items]);

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

  const updateStatuses = async (ids: string[], status: ModerationStatus): Promise<boolean> => {
    if (!ids.length || status === "Pending") return false;
    setActionError(null);
    const rejectionReason = moderationReason.trim();
    try {
      await Promise.all(
        ids.map((id) => patchModerationCaseStatus(id, status, status === "Rejected" ? rejectionReason : undefined)),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update status");
      return false;
    }
    setItems((prev) => prev.map((item) => ids.includes(item.id) ? { ...item, status } : item));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    return true;
  };

  const handleReviewCaseAction = async (id: string, status: Extract<ModerationStatus, "Approved" | "Rejected">) => {
    if (status === "Rejected" && !moderationReason.trim()) {
      setActionError("Moderation Reason is required before rejecting a case");
      return;
    }
    const success = await updateStatuses([id], status);
    if (success) {
      setActiveCaseId(null);
      setModerationReason("");
    }
  };

  const openCaseReview = async (id: string) => {
    setActiveCaseId(id);
    setModerationReason("");
    setActionError(null);
    try {
      const detail = await fetchModerationCaseById(id);
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...detail } : item));
    } catch {
      // Keep existing data if detail fetch fails
    }
  };

  return (
    <AdminShell active="lost-found" title="Lost & Found — Moderation Queue">
      <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col gap-4">
        <FilterBar
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabCounts={tabCounts}
          query={query}
          onQueryChange={setQuery}
          highValueOnly={highValueOnly}
          onHighValueOnlyChange={setHighValueOnly}
        />

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
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            selectedIds={selectedIds}
            allVisibleSelected={allVisibleSelected}
            activeCaseId={activeCaseId}
            onToggleSelect={toggleCaseSelection}
            onToggleSelectAll={toggleSelectAllVisible}
            onOpenCase={openCaseReview}
            isLoading={isLoading}
          />

          {activeCase && (
            <CaseDetailPanel
              caseItem={activeCase}
              moderationReason={moderationReason}
              errorMessage={actionError}
              onModerationReasonChange={setModerationReason}
              onApprove={() => void handleReviewCaseAction(activeCase.id, "Approved")}
              onReject={() => void handleReviewCaseAction(activeCase.id, "Rejected")}
              onClose={() => setActiveCaseId(null)}
            />
          )}
        </section>

        <BulkActionBar
          selectedCount={selectedIds.length}
          onApproveSelected={() => updateStatuses(selectedIds, "Approved")}
          onRejectSelected={() => updateStatuses(selectedIds, "Rejected")}
        />
      </div>
    </AdminShell>
  );
}

