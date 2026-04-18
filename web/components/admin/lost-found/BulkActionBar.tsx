"use client";

import { Button } from "@/components/ui/button";

type BulkActionBarProps = {
  selectedCount: number;
  onApproveSelected: () => void;
  onRejectSelected: () => void;
};

export function BulkActionBar({ selectedCount, onApproveSelected, onRejectSelected }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-30 rounded-xl bg-primary p-3 text-primary-foreground shadow-fab">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium">{selectedCount} case(s) selected</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-8 rounded-md px-3 text-xs"
            onClick={onRejectSelected}
          >
            Mark as Rejected
          </Button>
          <Button
            type="button"
            className="h-8 rounded-md bg-white px-3 text-xs text-primary hover:bg-white/90"
            onClick={onApproveSelected}
          >
            Approve Selected
          </Button>
        </div>
      </div>
    </div>
  );
}
