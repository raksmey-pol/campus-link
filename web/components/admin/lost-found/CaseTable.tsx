"use client";

import { AlertCircle, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ModerationCase, ModerationStatus } from "@/components/admin/types";

type CaseTableProps = {
  items: ModerationCase[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  pageStart: number;
  pageEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  selectedIds: string[];
  allVisibleSelected: boolean;
  activeCaseId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenCase: (id: string) => void;
  isLoading: boolean;
};

function tierClass(tier: string): string {
  const t = tier.toLowerCase();
  if (t.includes("very high") || t === "high" || t === "high value") {
    return "bg-destructive/15 text-destructive";
  }
  if (t.includes("med") || t.includes("medium")) {
    return "bg-warning/20 text-warning";
  }
  return "bg-muted text-muted-foreground";
}

const statusClass: Record<ModerationStatus, string> = {
  Pending: "bg-warning/20 text-warning",
  Approved: "bg-success/15 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};

const SKELETON_ROWS = 5;

export function CaseTable({
  items,
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions,
  pageStart,
  pageEnd,
  onPageChange,
  onPageSizeChange,
  selectedIds,
  allVisibleSelected,
  activeCaseId,
  onToggleSelect,
  onToggleSelectAll,
  onOpenCase,
  isLoading,
}: CaseTableProps) {
  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-card shadow-card">
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="sticky top-0 z-10 bg-muted/95 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
            <tr>
              <th className="w-10 p-3">
                <button type="button" onClick={onToggleSelectAll} aria-label="Select all visible cases">
                  {allVisibleSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </th>
              <th className="p-3">Case</th>
              <th className="p-3">Item</th>
              <th className="p-3">Tier</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reporter</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">AI</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3"><div className="h-4 w-4 animate-pulse rounded bg-muted" /></td>
                    <td className="p-3"><div className="h-3 w-16 animate-pulse rounded bg-muted" /></td>
                    <td className="p-3">
                      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                      <div className="mt-1.5 h-2.5 w-20 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="p-3"><div className="h-5 w-16 animate-pulse rounded bg-muted" /></td>
                    <td className="p-3"><div className="h-5 w-16 animate-pulse rounded bg-muted" /></td>
                    <td className="p-3"><div className="h-3 w-24 animate-pulse rounded bg-muted" /></td>
                    <td className="p-3"><div className="h-3 w-20 animate-pulse rounded bg-muted" /></td>
                    <td className="p-3"><div className="h-3 w-12 animate-pulse rounded bg-muted" /></td>
                    <td className="p-3"><div className="ml-auto h-6 w-14 animate-pulse rounded bg-muted" /></td>
                  </tr>
                ))
              : items.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  const opened = activeCaseId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onOpenCase(item.id)}
                      className={cn(
                        "cursor-pointer border-t border-border text-xs transition-colors",
                        opened ? "bg-primary/8" : "hover:bg-muted/30",
                      )}
                    >
                      <td className="p-3 align-middle">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
                          aria-label={`Select ${item.id}`}
                        >
                          {selected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 align-middle text-[11px] font-semibold text-muted-foreground">{item.id}</td>
                      <td className="p-3 align-middle">
                        <p className="text-sm font-semibold text-foreground">{item.item}</p>
                        <p className="text-[11px] text-muted-foreground">{item.location}</p>
                      </td>
                      <td className="p-3 align-middle">
                        <span className={cn("inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]", tierClass(item.tier))}>
                          {item.tier}
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        <span className={cn("inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]", statusClass[item.status])}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                            {item.initials}
                          </span>
                          <span className="text-xs text-foreground">{item.reporter}</span>
                        </div>
                      </td>
                      <td className="p-3 align-middle text-xs text-muted-foreground">{item.submittedAt}</td>
                      <td className="p-3 align-middle">
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", item.aiStatus === "Flagged" ? "text-destructive" : "text-success")}>
                          {item.aiStatus === "Flagged" ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {item.aiStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-7 rounded-md px-2 text-xs text-primary"
                          onClick={(e) => { e.stopPropagation(); onOpenCase(item.id); }}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {!isLoading && totalItems === 0 && (
        <div className="border-t border-border px-4 py-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">No cases match the current filter.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Try adjusting the search or tab.</p>
        </div>
      )}

      {/* Pagination footer */}
      <div className="border-t border-border bg-card px-3 py-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {totalItems === 0 ? "No results" : `Showing ${pageStart}–${pageEnd} of ${totalItems}`}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="rows-per-page">Rows</label>
            <select
              id="rows-per-page"
              className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || totalItems === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-14 text-center text-xs text-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || totalItems === 0}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
