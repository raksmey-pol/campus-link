"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { SwapSocketProvider } from "@/contexts/SwapSocketContext";
import {
  Plus, ArrowLeftRight, Clock, CheckCircle2,
  AlertCircle, Search, Loader2, X, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CourseSelect } from "@/components/CourseSelect";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  fetchSwaps, fetchMySwaps, fetchMyMatches, createSwap, cancelSwap,
  confirmMatch, declineMatch,
  formatExpiresAt, formatRelativeTime,
  type BackendSwapRequest, type BackendSwapMatch, type SwapStatus, type MatchStatus,
} from "@/lib/services/swap";
import { getUserDisplayName } from "@/lib/services/swap";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "board" | "mine" | "matches";

// ─── Constants ────────────────────────────────────────────────────────────────

const statusConfig: Record<SwapStatus, { label: string; className: string }> = {
  OPEN:      { label: "Open",      className: "bg-primary/10 text-primary" },
  MATCHED:   { label: "Matched!",  className: "bg-warning/10 text-warning" },
  ACCEPTED:  { label: "Accepted",  className: "bg-info/10 text-info" },
  COMPLETED: { label: "Completed", className: "bg-success/10 text-success" },
  EXPIRED:   { label: "Expired",   className: "bg-muted text-muted-foreground" },
  CANCELLED: { label: "Cancelled", className: "bg-destructive/10 text-destructive" },
};

const matchStatusConfig: Record<MatchStatus, { label: string; className: string }> = {
  PROPOSED:  { label: "Awaiting Confirmation", className: "bg-warning/10 text-warning" },
  ACCEPTED:  { label: "Partially Confirmed",   className: "bg-info/10 text-info" },
  COMPLETED: { label: "Completed",             className: "bg-success/10 text-success" },
  DECLINED:  { label: "Declined",              className: "bg-destructive/10 text-destructive" },
};

// ─── Zod schema ───────────────────────────────────────────────────────────────

const createSwapSchema = z
  .object({
    swap_type: z.enum(["SECTION", "COURSE"]),
    current_course_id: z.coerce.number().min(1, "Required"),
    current_section: z.string().max(10).optional(),
    // desired_course_id: z.preprocess(
    //   (v) => (v === "" || v === 0 || v === "0" ? undefined : v),
    //   z.coerce.number().min(1).optional(),
    // ),
    desired_course_id: z.number().optional(),
    desired_section: z.string().max(10).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (d) => d.swap_type !== "COURSE" || !!d.desired_course_id,
    { message: "Desired course is required for course swaps", path: ["desired_course_id"] },
  );

type CreateSwapForm = z.infer<typeof createSwapSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SwapCard({
  swap,
  showActions,
  onCancel,
}: {
  swap: BackendSwapRequest;
  showActions?: boolean;
  onCancel?: (id: number) => void;
}) {
  const config = statusConfig[swap.status];
  const isCancellable = swap.status === "OPEN" || swap.status === "MATCHED";

  return (
    <div className="rounded-2xl bg-card shadow-card p-4 transition-all hover:shadow-card-hover">
      <div className="flex items-center justify-between mb-3">
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", config.className)}>
          {config.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {swap.swap_type === "SECTION" ? "Section" : "Course"} swap
          </span>
          {showActions && isCancellable && onCancel && (
            <button
              onClick={() => onCancel(swap.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Cancel request"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-xl bg-surface p-3 text-center">
          <p className="text-sm font-bold text-foreground">{swap.current_course.code}</p>
          {swap.current_section && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Sec {swap.current_section}</p>
          )}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 rounded-xl bg-surface p-3 text-center">
          <p className="text-sm font-bold text-foreground">
            {swap.desired_course?.code ?? swap.current_course.code}
          </p>
          {swap.desired_section && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Sec {swap.desired_section}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{swap.requester ? "by" + getUserDisplayName(swap.requester) + " · ": ""}{formatRelativeTime(swap.created_at)}</span>
        {swap.status === "OPEN" && (
          <span className="text-warning font-medium">{formatExpiresAt(swap.expires_at)}</span>
        )}
      </div>
      {swap.notes && (
        <p className="mt-2 text-[11px] text-muted-foreground italic border-t border-border pt-2">
          &quot;{swap.notes}&quot;
        </p>
      )}
    </div>
  );
}

function MatchCard({
  match,
  onConfirm,
  onDecline,
  confirming,
}: {
  match: BackendSwapMatch;
  onConfirm: (id: number) => void;
  onDecline: (id: number) => void;
  confirming: number | null;
}) {
  const config = matchStatusConfig[match.status];
  const isPending = match.status === "PROPOSED" || match.status === "ACCEPTED";
  const confirmedCount = (match.confirmations ?? []).length;
  const totalCount = match.requestC ? 3 : 2;

  const requests = [match.requestA, match.requestB, ...(match.requestC ? [match.requestC] : [])];

  return (
    <div className="rounded-2xl bg-card shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", config.className)}>
          {config.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {match.match_type === "CHAIN" ? "3-way chain" : "Direct"} match
          </span>
          <span className="text-[10px] text-muted-foreground">
            {confirmedCount}/{totalCount} confirmed
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {requests.map((req, i) => (
          <div key={req.id} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-4">{i + 1}.</span>
            <span className="font-semibold text-foreground">{req.requester.display_name}</span>
            <span className="text-muted-foreground">{req.current_course.code}</span>
            {req.current_section && <span className="text-muted-foreground">§{req.current_section}</span>}
            <ArrowLeftRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{req.desired_course?.code ?? req.current_course.code}</span>
            {req.desired_section && <span className="text-muted-foreground">§{req.desired_section}</span>}
          </div>
        ))}
      </div>

      {/* Confirmation progress */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
        />
      </div>

      {isPending && (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 rounded-xl text-xs h-9 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => onDecline(match.id)}
            disabled={confirming === match.id}
          >
            Decline
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-xl text-xs h-9"
            onClick={() => onConfirm(match.id)}
            disabled={confirming === match.id}
          >
            {confirming === match.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Confirm Swap"
            )}
          </Button>
        </div>
      )}

      {match.status === "COMPLETED" && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-success text-xs font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Swap completed successfully
        </div>
      )}
    </div>
  );
}

function CreateSwapDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSwapForm>({
    resolver: zodResolver(createSwapSchema),
    defaultValues: { swap_type: "SECTION" },
  });

  const swapType = watch("swap_type");

  const onSubmit = async (data: CreateSwapForm) => {
    try {
      await createSwap({
        swap_type: data.swap_type,
        current_course_id: data.current_course_id,
        current_section: data.current_section || undefined,
        desired_course_id: data.desired_course_id || undefined,
        // only include desired_course_id if it's a COURSE swap AND has a value
        ...(data.swap_type === "COURSE" && data.desired_course_id
        ? { desired_course_id: data.desired_course_id }
        : {}),
        desired_section: data.desired_section || undefined,
        notes: data.notes || undefined,
      });
      toast.success("Swap request created!", {
        description: "Matching engine is looking for a swap partner.",
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Failed to create swap", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>New Swap Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Swap type */}
          <div>
            <Label>Swap Type</Label>
            <Select
              value={swapType}
              onValueChange={(v) => setValue("swap_type", v as "SECTION" | "COURSE")}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SECTION">Section Swap</SelectItem>
                <SelectItem value="COURSE">Course Swap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Current Course ID</Label>
              <CourseSelect
                value={watch("current_course_id")}
                onChange={(courseId) =>
                  setValue("current_course_id", courseId, { shouldValidate: true })
                }
                placeholder="Select current course"
              />
              {errors.current_course_id && (
                <p className="text-[11px] text-destructive mt-1">{errors.current_course_id.message}</p>
              )}
            </div>
            <div>
              <Label>Current Section</Label>
              <Input
                placeholder="e.g., A"
                className="mt-1.5 rounded-xl"
                {...register("current_section")}
              />
            </div>
          </div>

          {/* Desired */}
          <div className="grid grid-cols-2 gap-3">
            {swapType === "COURSE" && (
              <div>
                <Label>Desired Course ID</Label>
                <CourseSelect
                  value={watch("desired_course_id")}
                  onChange={(courseId) =>
                    setValue("desired_course_id", courseId, { shouldValidate: true })
                  }
                  placeholder="Select desired course"
                />
                {errors.desired_course_id && (
                  <p className="text-[11px] text-destructive mt-1">{errors.desired_course_id.message}</p>
                )}
              </div>
            )}
            <div className={swapType === "SECTION" ? "col-span-2" : ""}>
              <Label>Desired Section</Label>
              <Input
                placeholder="e.g., B"
                className="mt-1.5 rounded-xl"
                {...register("desired_section")}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes <span className="text-muted-foreground text-[11px]">(optional)</span></Label>
            <Textarea
              placeholder="Any additional context..."
              className="mt-1.5 rounded-xl resize-none text-sm"
              rows={2}
              {...register("notes")}
            />
          </div>

          <Button type="submit" className="w-full rounded-xl h-11" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
            ) : (
              "Submit Request"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SwapBoard() {
  const [activeTab, setActiveTab] = useState<Tab>("board");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Data state
  const [boardSwaps, setBoardSwaps] = useState<BackendSwapRequest[]>([]);
  const [mySwaps, setMySwaps] = useState<BackendSwapRequest[]>([]);
  const [myMatches, setMyMatches] = useState<BackendSwapMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);

  // Token for socket connection
  const { token } = useAuth();

  // ─── Loaders ────────────────────────────────────────────────────────────────

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSwaps({ status: "OPEN" });
      setBoardSwaps(res.data);
    } catch {
      toast.error("Failed to load swap board");
    } finally {
      setLoading(false);
    }
  }, []);

const loadMine = useCallback(async () => {
  setLoading(true);
  try {
    const data = await fetchMySwaps();
    setMySwaps(Array.isArray(data) ? data : []);
  } catch {
    toast.error("Failed to load your swap requests");
  } finally {
    setLoading(false);
  }
}, []);

const loadMatches = useCallback(async () => {
  setLoading(true);
  try {
    const data = await fetchMyMatches();
    setMyMatches(Array.isArray(data) ? data : []);
  } catch {
    toast.error("Failed to load matches");
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    if (activeTab === "board") void loadBoard();
    if (activeTab === "mine") void loadMine();
    if (activeTab === "matches") void loadMatches();
  }, [activeTab, loadBoard, loadMine, loadMatches]);

  // ─── Socket callbacks ────────────────────────────────────────────────────────

  const handleMatchFound = useCallback(() => {
    void loadMatches();
    void loadMine();
  }, [loadMatches, loadMine]);

  const handleCompleted = useCallback(() => {
    void loadMatches();
    void loadMine();
  }, [loadMatches, loadMine]);

  const handleExpired = useCallback(() => {
    void loadMine();
    void loadBoard();
  }, [loadMine, loadBoard]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleCancel = async (id: number) => {
    try {
      await cancelSwap(id);
      toast.success("Swap request cancelled");
      void loadMine();
      void loadBoard();
    } catch (err) {
      toast.error("Failed to cancel", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleConfirm = async (matchId: number) => {
    setConfirming(matchId);
    try {
      await confirmMatch(matchId);
      toast.success("Match confirmed!");
      void loadMatches();
    } catch (err) {
      toast.error("Failed to confirm", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setConfirming(null);
    }
  };

  const handleDecline = async (matchId: number) => {
    try {
      await declineMatch(matchId);
      toast.info("Match declined. Your request is back to open.");
      void loadMatches();
      void loadMine();
    } catch (err) {
      toast.error("Failed to decline", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  // ─── Filtered board ──────────────────────────────────────────────────────────

  const filteredBoard = boardSwaps.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.current_course.code.toLowerCase().includes(q) ||
      (s.desired_course?.code ?? "").toLowerCase().includes(q) ||
      (s.requester ? getUserDisplayName(s.requester) : "Unknown").toLowerCase().includes(q);
    const matchesStatus = filterStatus === "ALL" || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingMatchCount = myMatches.filter(
    (m) => m.status === "PROPOSED" || m.status === "ACCEPTED",
  ).length;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SwapSocketProvider
      token={token}
      onMatchFound={handleMatchFound}
      onCompleted={handleCompleted}
      onExpired={handleExpired}
    >
      <AppLayout>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Course Swap</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Find swap partners for your courses
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab">
                  <Plus className="h-5 w-5" />
                </button>
              </DialogTrigger>
            </Dialog>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-muted/50 p-1">
            {(["board", "mine", "matches"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold transition-all capitalize relative",
                  activeTab === tab
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "board" ? "Swap Board" : tab === "mine" ? "My Requests" : "My Matches"}
                {tab === "matches" && pendingMatchCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {pendingMatchCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Board tab */}
          {activeTab === "board" && (
            <>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by course or requester..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-11 rounded-xl bg-card shadow-card border-0 h-11"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
                {["ALL", "OPEN", "MATCHED", "COMPLETED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-all",
                      filterStatus === s
                        ? "bg-primary text-primary-foreground shadow-fab"
                        : "bg-card shadow-card text-muted-foreground",
                    )}
                  >
                    {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBoard.map((swap) => (
                    <SwapCard key={swap.id} swap={swap} />
                  ))}
                  {filteredBoard.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-card shadow-card py-16 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                        <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">No swap requests found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* My Requests tab */}
          {activeTab === "mine" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{mySwaps.length} request{mySwaps.length !== 1 ? "s" : ""}</p>
                <button
                  onClick={() => void loadMine()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {mySwaps.map((swap) => (
                    <SwapCard
                      key={swap.id}
                      swap={swap}
                      showActions
                      onCancel={handleCancel}
                    />
                  ))}
                  {mySwaps.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-card shadow-card py-16 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">No active requests</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tap + to create a swap request.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* My Matches tab */}
          {activeTab === "matches" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {pendingMatchCount > 0
                    ? `${pendingMatchCount} pending confirmation`
                    : "No pending matches"}
                </p>
                <button
                  onClick={() => void loadMatches()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {myMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onConfirm={handleConfirm}
                      onDecline={handleDecline}
                      confirming={confirming}
                    />
                  ))}
                  {myMatches.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-card shadow-card py-16 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">No matches yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Matches appear here when the engine finds a partner.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Create dialog — rendered outside tab content so it persists */}
        <CreateSwapDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {
            void loadBoard();
            void loadMine();
          }}
        />
      </AppLayout>
    </SwapSocketProvider>
  );
}