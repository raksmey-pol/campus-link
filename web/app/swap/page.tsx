"use client";

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Plus,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SwapStatus = "OPEN" | "MATCHED" | "ACCEPTED" | "COMPLETED" | "EXPIRED" | "CANCELLED";

interface SwapRequest {
  id: number;
  requester: string;
  swapType: "section" | "course";
  currentCourse: string;
  currentSection: string;
  desiredCourse: string;
  desiredSection: string;
  status: SwapStatus;
  createdAt: string;
  expiresAt: string;
}

const mockSwaps: SwapRequest[] = [
  { id: 1, requester: "Lyhour H.", swapType: "section", currentCourse: "INFO 653", currentSection: "001", desiredCourse: "INFO 653", desiredSection: "002", status: "OPEN", createdAt: "1 hour ago", expiresAt: "7 days" },
  { id: 2, requester: "Raksmey P.", swapType: "course", currentCourse: "ENG 102", currentSection: "001", desiredCourse: "ENG 201", desiredSection: "001", status: "MATCHED", createdAt: "3 hours ago", expiresAt: "5 days" },
  { id: 3, requester: "Virakyuth S.", swapType: "section", currentCourse: "CS 201", currentSection: "002", desiredCourse: "CS 201", desiredSection: "001", status: "COMPLETED", createdAt: "2 days ago", expiresAt: "—" },
  { id: 4, requester: "Kimhong R.", swapType: "course", currentCourse: "MATH 301", currentSection: "001", desiredCourse: "MATH 201", desiredSection: "001", status: "OPEN", createdAt: "4 hours ago", expiresAt: "6 days" },
  { id: 5, requester: "Sovanrith S.", swapType: "section", currentCourse: "BUS 201", currentSection: "001", desiredCourse: "BUS 201", desiredSection: "003", status: "ACCEPTED", createdAt: "1 day ago", expiresAt: "3 days" },
  { id: 6, requester: "Kimheng C.", swapType: "section", currentCourse: "CS 305", currentSection: "002", desiredCourse: "CS 305", desiredSection: "001", status: "EXPIRED", createdAt: "1 week ago", expiresAt: "—" },
];

const statusConfig: Record<SwapStatus, { label: string; className: string; icon: typeof Clock }> = {
  OPEN: { label: "Open", className: "bg-primary/10 text-primary", icon: Clock },
  MATCHED: { label: "Matched!", className: "bg-warning/10 text-warning", icon: AlertCircle },
  ACCEPTED: { label: "Accepted", className: "bg-info/10 text-info", icon: CheckCircle2 },
  COMPLETED: { label: "Completed", className: "bg-success/10 text-success", icon: CheckCircle2 },
  EXPIRED: { label: "Expired", className: "bg-muted text-muted-foreground", icon: Clock },
  CANCELLED: { label: "Cancelled", className: "bg-destructive/10 text-destructive", icon: AlertCircle },
};

export default function SwapBoard() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = mockSwaps.filter((s) => {
    const matchesSearch =
      s.currentCourse.toLowerCase().includes(search.toLowerCase()) ||
      s.desiredCourse.toLowerCase().includes(search.toLowerCase()) ||
      s.requester.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Swap Board</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Find swap partners
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
                <DialogTitle>New Swap Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Swap Type</Label>
                  <Select>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="section">Section Swap</SelectItem>
                      <SelectItem value="course">Course Swap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Current Course</Label>
                    <Input placeholder="e.g., INFO 653" className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label>Current Section</Label>
                    <Input placeholder="e.g., 001" className="mt-1.5 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Desired Course</Label>
                    <Input placeholder="e.g., INFO 653" className="mt-1.5 rounded-xl" />
                  </div>
                  <div>
                    <Label>Desired Section</Label>
                    <Input placeholder="e.g., 002" className="mt-1.5 rounded-xl" />
                  </div>
                </div>
                <Button className="w-full rounded-xl h-11" onClick={() => setDialogOpen(false)}>
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by course or requester..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 rounded-xl bg-card shadow-card border-0 h-11"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {["ALL", "OPEN", "MATCHED", "ACCEPTED", "COMPLETED"].map((s) => (
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

        {/* Swap Cards */}
        <div className="space-y-3">
          {filtered.map((swap) => {
            const config = statusConfig[swap.status];
            return (
              <div
                key={swap.id}
                className="rounded-2xl bg-card shadow-card p-4 transition-all hover:shadow-card-hover"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", config.className)}>
                    {config.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {swap.swapType === "section" ? "Section" : "Course"} swap
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-xl bg-surface p-3 text-center">
                    <p className="text-sm font-bold text-foreground">{swap.currentCourse}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Sec {swap.currentSection}</p>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 rounded-xl bg-surface p-3 text-center">
                    <p className="text-sm font-bold text-foreground">{swap.desiredCourse}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Sec {swap.desiredSection}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>by {swap.requester} · {swap.createdAt}</span>
                  {swap.expiresAt !== "—" && (
                    <span className="text-warning font-medium">Expires {swap.expiresAt}</span>
                  )}
                </div>

                {swap.status === "MATCHED" && (
                  <Button size="sm" className="w-full mt-3 rounded-xl text-xs h-9">
                    Confirm Match
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card shadow-card py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
              <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">No swap requests found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
