"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ArrowLeftRight,
  TrendingUp,
  Package,
  Users,
  Plus,
  Award,
  Camera,
  MessageSquare,
  Repeat,
  Calendar,
  Eye,
  EyeOff,
  Shield,
  ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import {
  fetchMyPointHistory,
  type UserPointHistoryEntry,
} from "@/lib/services/user-points";

const adminStats = [
  { label: "Recovered", value: "47", icon: Package, change: "+12 this week", color: "bg-primary/10 text-primary", border: "border-primary/30" },
  { label: "Reviews", value: "238", icon: BookOpen, change: "+34 this month", color: "bg-warning/10 text-warning", border: "border-warning/30" },
  { label: "Swaps", value: "89", icon: ArrowLeftRight, change: "+8 this week", color: "bg-info/10 text-info", border: "border-info/30" },
  { label: "Users", value: "512", icon: Users, change: "+45 this month", color: "bg-destructive/10 text-destructive", border: "border-destructive/30" },
];

const recentItems = [
  { id: 1, title: "Blue Water Bottle", location: "Library 2F", status: "APPROVED", time: "2h ago" },
  { id: 2, title: "AirPods Pro Case", location: "Cafeteria", status: "PENDING", time: "4h ago" },
  { id: 3, title: "Student ID Card", location: "Room 301", status: "CLAIMED", time: "1d ago" },
];

const recentReviews = [
  { course: "INFO 653", title: "Web Development III", rating: 4.5, reviewer: "Anonymous" },
  { course: "CS 201", title: "Data Structures", rating: 3.8, reviewer: "Raksmey P." },
  { course: "MATH 301", title: "Linear Algebra", rating: 4.2, reviewer: "Anonymous" },
];

const statusColor: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  APPROVED: "bg-success/10 text-success",
  CLAIMED: "bg-info/10 text-info",
  RESOLVED: "bg-muted text-muted-foreground",
};

const quickActions = [
  { icon: Camera, label: "Report Item", path: "/lost-found", color: "bg-primary" },
  { icon: MessageSquare, label: "Review", path: "/courses", color: "bg-warning" },
  { icon: Repeat, label: "Swap", path: "/swap", color: "bg-info" },
];

const pointTypeLabelMap: Record<string, string> = {
  FINDER_REWARD: "Finder reward",
  TRUST_CONFIRM: "Trust confirmation",
  RESOURCE_UPLOAD: "Resource upload",
  REVIEW_HELPFUL: "Helpful review",
  QA_UPVOTE: "Q&A upvote",
  MENTOR_BONUS: "Mentor bonus",
  SWAP_COMPLETE: "Swap completed",
};

const upcomingClasses = [
  { time: "09:00", name: "Web Development III", room: "Room 401", code: "INFO 653" },
  { time: "11:00", name: "Data Structures", room: "Room 205", code: "CS 201" },
  { time: "14:00", name: "Linear Algebra", room: "Room 102", code: "MATH 301" },
];

export default function Dashboard() {
  const [fabOpen, setFabOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [civicPoints, setCivicPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<UserPointHistoryEntry[]>([]);
  const [pointHistoryLoading, setPointHistoryLoading] = useState(false);
  const { role, setRole } = useRole();

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  useEffect(() => {
    if (role !== "student") {
      return;
    }

    let isMounted = true;

    async function loadPointHistory() {
      setPointHistoryLoading(true);

      try {
        const history = await fetchMyPointHistory({ limit: 12 });

        if (!isMounted) {
          return;
        }

        setCivicPoints(history.civicPoints);
        setPointHistory(history.transactions);
      } catch {
        if (!isMounted) {
          return;
        }

        setCivicPoints(0);
        setPointHistory([]);
      } finally {
        if (isMounted) {
          setPointHistoryLoading(false);
        }
      }
    }

    void loadPointHistory();

    return () => {
      isMounted = false;
    };
  }, [role]);

  const pointBreakdown = useMemo(() => {
    let reports = 0;
    let reviews = 0;
    let swaps = 0;

    for (const entry of pointHistory) {
      if (entry.amount <= 0) {
        continue;
      }

      if (entry.type === "FINDER_REWARD" || entry.type === "TRUST_CONFIRM") {
        reports += entry.amount;
        continue;
      }

      if (entry.type === "SWAP_COMPLETE") {
        swaps += entry.amount;
        continue;
      }

      reviews += entry.amount;
    }

    return { reports, reviews, swaps };
  }, [pointHistory]);

  const recentPointActivity = useMemo(() => pointHistory.slice(0, 5), [pointHistory]);

  function formatPointDate(value: string) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return "Unknown date";
    }

    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Greeting */}
        <div className="flex items-start justify-between pt-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {dayName} · {dateStr}
            </p>
            <h1 className="mt-1 text-[1.65rem] font-extrabold tracking-tight text-foreground leading-none">
              Good {today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening"}
            </h1>
          </div>
          <button
            onClick={() => setRole(role === "student" ? "admin" : "student")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors",
              role === "admin"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Shield className="h-3 w-3" />
            {role === "admin" ? "Admin" : "Student"}
          </button>
        </div>

        {/* Admin Stats */}
        {role === "admin" && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4">
            {adminStats.map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "flex-shrink-0 w-[148px] lg:w-auto rounded-2xl bg-card shadow-card p-4 border-t-2",
                  stat.border
                )}
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", stat.color)}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
                <p className="mt-3 text-[2rem] font-extrabold text-foreground tracking-tight leading-none">
                  {stat.value}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground mt-1">{stat.label}</p>
                <p className="mt-2 flex items-center gap-1 text-[10px] text-success font-semibold">
                  <TrendingUp className="h-3 w-3" />
                  {stat.change}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Civic Points Card */}
        {role === "student" && (
          <div className="relative overflow-hidden rounded-3xl shadow-fab">
            {/* Layered gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(217_80%_26%)] to-[hsl(210_55%_20%)]" />
            {/* Decorative shapes */}
            <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/[0.05]" />
            <div className="absolute right-8 bottom-0 h-28 w-28 rounded-full bg-white/[0.07]" />
            <div className="absolute left-1/2 -top-8 h-32 w-32 rounded-full bg-white/[0.03]" />

            <div className="relative z-10 p-5 sm:p-6">
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Award className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                    Civic Points
                  </p>
                </div>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {balanceVisible ? (
                    <Eye className="h-4 w-4 text-white/80" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-white/80" />
                  )}
                </button>
              </div>

              {/* Balance */}
              <div className="mb-1">
                <p className="text-5xl font-extrabold tracking-tight text-white leading-none tabular-nums">
                  {balanceVisible ? civicPoints.toLocaleString() : "•••••"}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  total points earned
                </p>
              </div>

              <div className="my-4 h-px bg-white/10" />

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Reports", value: pointBreakdown.reports, color: "text-success" },
                  { label: "Reviews", value: pointBreakdown.reviews, color: "text-warning" },
                  { label: "Swaps", value: pointBreakdown.swaps, color: "text-info" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white/[0.08] px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/50 mb-1">
                      {item.label}
                    </p>
                    <p className={cn("text-base font-extrabold tabular-nums", item.color)}>
                      +{item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Rank bar */}
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5">
                <span className="text-[11px] font-medium text-white/60">Semester rank</span>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white/70" style={{ width: "97.7%" }} />
                  </div>
                  <span className="text-sm font-extrabold text-white tabular-nums">#12 / 512</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Quick Actions
          </p>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.path}
                className="group flex flex-col items-center gap-2.5 rounded-2xl bg-card shadow-card p-4 transition-all active:scale-[0.97] hover:shadow-card-hover"
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground transition-transform duration-200 group-hover:scale-105",
                    action.color
                  )}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-semibold text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        {role === "student" && (
          <div className="rounded-2xl bg-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <h2 className="text-sm font-semibold text-foreground">Today&apos;s Schedule</h2>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
            <div className="divide-y divide-border">
              {upcomingClasses.map((cls, i) => (
                <div key={cls.code} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-[3.25rem] flex-shrink-0 text-right">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        i === 0 ? "text-primary" : "text-foreground"
                      )}
                    >
                      {cls.time}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "h-10 w-0.5 flex-shrink-0 rounded-full",
                      i === 0 ? "bg-primary" : "bg-border"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{cls.name}</p>
                    <p className="text-[11px] text-muted-foreground">{cls.code} · {cls.room}</p>
                  </div>
                  {i === 0 && (
                    <span className="flex-shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                      Next
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Point Activity */}
        {role === "student" && (
          <div className="rounded-2xl bg-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <h2 className="text-sm font-semibold text-foreground">Point Activity</h2>
              <span className="text-[11px] font-medium text-muted-foreground">Recent rewards</span>
            </div>
            <div className="divide-y divide-border">
              {pointHistoryLoading ? (
                <div className="px-4 py-4 flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ) : recentPointActivity.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  No activity yet. Earn points through Lost &amp; Found, Courses, and Swap.
                </div>
              ) : (
                recentPointActivity.map((entry) => {
                  const isPositive = entry.amount >= 0;
                  const amountText = `${isPositive ? "+" : ""}${entry.amount}`;
                  const entryLabel = pointTypeLabelMap[entry.type] ?? entry.type;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0",
                          isPositive ? "bg-success/10" : "bg-destructive/10"
                        )}
                      >
                        <Award
                          className={cn(
                            "h-4 w-4",
                            isPositive ? "text-success" : "text-destructive"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{entryLabel}</p>
                        <p className="text-[11px] text-muted-foreground">{formatPointDate(entry.createdAt)}</p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-extrabold tabular-nums",
                          isPositive ? "text-success" : "text-destructive"
                        )}
                      >
                        {amountText}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Recent Lost Items */}
        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Reports</h2>
            <Link
              href="/lost-found"
              className="flex items-center gap-0.5 text-[11px] font-semibold text-primary transition-colors hover:text-primary/70"
            >
              See all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href={`/lost-found/${item.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted flex-shrink-0">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.location} · {item.time}</p>
                </div>
                <span
                  className={cn(
                    "flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
                    statusColor[item.status]
                  )}
                >
                  {item.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Reviews</h2>
            <Link
              href="/courses"
              className="flex items-center gap-0.5 text-[11px] font-semibold text-primary transition-colors hover:text-primary/70"
            >
              See all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentReviews.map((review) => (
              <div key={review.course} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{review.title}</p>
                  <p className="text-[11px] text-muted-foreground">{review.course} · {review.reviewer}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-warning">★</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{review.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-5 z-40 lg:hidden">
        {fabOpen && (
          <div className="mb-3 flex flex-col items-end gap-2 animate-fade-in">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.path}
                className="flex items-center gap-2.5 rounded-full bg-card shadow-card-hover pl-4 pr-2 py-2"
                onClick={() => setFabOpen(false)}
              >
                <span className="text-xs font-semibold text-foreground">{action.label}</span>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground",
                    action.color
                  )}
                >
                  <action.icon className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab transition-transform duration-200",
            fabOpen && "rotate-45"
          )}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </AppLayout>
  );
}
