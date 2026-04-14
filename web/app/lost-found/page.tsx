"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Search,
  Plus,
  MapPin,
  Clock,
  Camera,
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
import { mockItems, type ItemStatus } from "./data";

const statusConfig: Record<ItemStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-warning/10 text-warning" },
  APPROVED: { label: "Approved", className: "bg-success/10 text-success" },
  CLAIMED: { label: "Claimed", className: "bg-info/10 text-info" },
  RESOLVED: { label: "Resolved", className: "bg-muted text-muted-foreground" },
};

export default function LostFound() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = mockItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Lost & Found</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Report or claim items
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab">
                <Plus className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Report a Found Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Item Title</Label>
                  <Input placeholder="e.g., Blue Water Bottle" className="mt-1.5 rounded-xl" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the item..." className="mt-1.5 rounded-xl" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Location Found</Label>
                    <Input placeholder="e.g., Library 2F" className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label>Value Tier</Label>
                    <Select>
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
                  <Label>Photo</Label>
                  <div className="mt-1.5 flex h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface text-muted-foreground hover:bg-muted transition-colors">
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="h-5 w-5" />
                      <span className="text-xs">Click to upload photo</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full rounded-xl h-11" onClick={() => setDialogOpen(false)}>
                  Submit Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 rounded-xl bg-card shadow-card border-0 h-11"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {["ALL", "PENDING", "APPROVED", "CLAIMED", "RESOLVED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all",
                filterStatus === s
                  ? "bg-primary text-primary-foreground shadow-fab"
                  : "bg-card shadow-card text-muted-foreground"
              )}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-card shadow-card overflow-hidden transition-all hover:shadow-card-hover"
            >
              <Link href={`/lost-found/${item.id}`} className="block">
                <div className="flex gap-3 p-3">
                {/* Photo */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={item.photoUrl}
                    alt={item.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-1">
                      {item.title}
                    </h3>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", statusConfig[item.status].className)}>
                      {statusConfig[item.status].label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.createdAt}
                    </span>
                  </div>
                </div>
                </div>
              </Link>

              {item.status === "APPROVED" && (
                <div className="px-3 pb-3">
                  <Link href={`/lost-found/${item.id}`} className="block">
                    <Button variant="outline" size="sm" className="w-full text-xs h-9 rounded-xl border-primary/20 text-primary hover:bg-primary/5">
                      Claim This Item
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card shadow-card py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">No items found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
