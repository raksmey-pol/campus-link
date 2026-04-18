"use client";

import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ModerationStatus } from "@/components/admin/types";

export type LostFoundTab = ModerationStatus | "All" | "Claim Requests";

type FilterBarProps = {
  tabs: readonly LostFoundTab[];
  activeTab: LostFoundTab;
  onTabChangeAction: (tab: LostFoundTab) => void;
  tabCounts: Record<LostFoundTab, number>;
  query: string;
  onQueryChangeAction: (query: string) => void;
  highValueOnly: boolean;
  onHighValueOnlyChangeAction: (value: boolean) => void;
};

export function FilterBar({
  tabs,
  activeTab,
  onTabChangeAction,
  tabCounts,
  query,
  onQueryChangeAction,
  highValueOnly,
  onHighValueOnlyChangeAction,
}: FilterBarProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-2">
      <div className="inline-flex rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChangeAction(tab)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              activeTab === tab && tab === "Claim Requests"
                ? "bg-warning/20 text-warning shadow-sm"
                : activeTab === tab
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab} ({tabCounts[tab]})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[240px] max-w-sm sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChangeAction(e.target.value)}
            placeholder="Search by case ID, item, or reporter..."
            className="h-10 rounded-lg bg-card pl-9 text-xs placeholder:text-muted-foreground/50"
          />
        </div>

        <Button
          type="button"
          variant={highValueOnly ? "default" : "secondary"}
          className="h-8 rounded-md px-3 text-xs"
          onClick={() => onHighValueOnlyChangeAction(!highValueOnly)}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          {highValueOnly ? "High Value Only" : "All Value Tiers"}
        </Button>
      </div>
    </section>
  );
}
