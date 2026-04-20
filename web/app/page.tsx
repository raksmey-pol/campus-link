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
  Clock,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import {
  fetchMyPointHistory,
  type UserPointHistoryEntry,
} from "@/lib/services/user-points";

const adminStats = [
  { label: "Recovered", value: "47", icon: Package, change: "+12 this week", color: "bg-primary/10 text-primary" },
  { label: "Reviews", value: "238", icon: BookOpen, change: "+34 this month", color: "bg-warning/10 text-warning" },
  { label: "Swaps", value: "89", icon: ArrowLeftRight, change: "+8 this week", color: "bg-info/10 text-info" },
  { label: "Users", value: "512", icon: Users, change: "+45 this month", color: "bg-destructive/10 text-destructive" },
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

    return {
      reports,
      reviews,
      swaps,
    };
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
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{dayName}, {dateStr}</p>
            <h1 className="text-xl font-bold text-foreground mt-0.5">
              Good {today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening"}, Student
            </h1>
          </div>
          {/* Role toggle for demo */}
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

        {/* Admin Stats - only for admin role */}
        {role === "admin" && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4">
            {adminStats.map((stat) => (
              <div
                key={stat.label}
                className="flex-shrink-0 w-[140px] lg:w-auto rounded-2xl bg-card shadow-card p-4"
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-success font-medium">
                  <TrendingUp className="h-3 w-3" />
                  {stat.change}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Student Hero Card - only for student role */}
        {role === "student" && (
          <div className="rounded-3xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(210_50%_25%)] p-5 text-primary-foreground shadow-card overflow-hidden relative">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
            <div className="absolute -right-4 bottom-0 h-20 w-20 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">Civic Points</p>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>

              <p className="text-4xl font-bold tracking-tight">
                {balanceVisible ? civicPoints.toLocaleString() : "•••"}
              </p>

              <div className="h-px bg-white/15 my-4" />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-60">Reports</p>
                  <p className="text-sm font-bold text-success mt-0.5">
                    +{pointBreakdown.reports.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-60">Reviews</p>
                  <p className="text-sm font-bold text-warning mt-0.5">
                    +{pointBreakdown.reviews.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-60">Swaps</p>
                  <p className="text-sm font-bold mt-0.5">+{pointBreakdown.swaps.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 rounded-xl bg-white/10 px-4 py-2.5">
                <span className="text-xs opacity-80">Semester rank</span>
                <span className="text-sm font-bold">#12 of 512</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.path}
                className="flex flex-col items-center gap-2 rounded-2xl bg-card shadow-card p-4 transition-all active:scale-[0.97] hover:shadow-card-hover"
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground", action.color)}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Today's Schedule - student only */}
        {role === "student" && (
          <div className="rounded-2xl bg-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 className="text-sm font-semibold text-foreground">Today&apos;s Schedule</h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            </div>
            <div>
              {upcomingClasses.map((cls, i) => (
                <div
                  key={cls.code}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    i < upcomingClasses.length - 1 && "border-b border-border"
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{cls.name}</p>
                    <p className="text-xs text-muted-foreground">{cls.code} · {cls.room}</p>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{cls.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {role === "student" && (
          <div className="rounded-2xl bg-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 className="text-sm font-semibold text-foreground">Recent Point Activity</h2>
              <span className="text-xs text-muted-foreground">Latest rewards</span>
            </div>
            <div>
              {pointHistoryLoading ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">Loading point activity...</div>
              ) : recentPointActivity.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  No point activity yet. Complete actions in Lost & Found, Courses, and Swap to earn points.
                </div>
              ) : (
                recentPointActivity.map((entry, index) => {
                  const isPositive = entry.amount >= 0;
                  const amountText = `${isPositive ? "+" : ""}${entry.amount}`;
                  const entryLabel = pointTypeLabelMap[entry.type] ?? entry.type;

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3",
                        index < recentPointActivity.length - 1 && "border-b border-border"
                      )}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{entryLabel}</p>
                        <p className="text-xs text-muted-foreground">{formatPointDate(entry.createdAt)}</p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-bold",
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
          <div className="flex items-center justify-between p-4 pb-2">
            <h2 className="text-sm font-semibold text-foreground">Recent Lost Items</h2>
            <Link href="/lost-found" className="text-xs font-medium text-primary">
              See all
            </Link>
          </div>
          <div>
            {recentItems.map((item, i) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i < recentItems.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.location} · {item.time}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", statusColor[item.status])}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 pb-2">
            <h2 className="text-sm font-semibold text-foreground">Recent Reviews</h2>
            <Link href="/courses" className="text-xs font-medium text-primary">
              See all
            </Link>
          </div>
          <div>
            {recentReviews.map((review, i) => (
              <div
                key={review.course}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i < recentReviews.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <BookOpen className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{review.course}</p>
                  <p className="text-xs text-muted-foreground">{review.title}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-warning">
                  <span>★</span>
                  <span>{review.rating}</span>
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
                <span className="text-xs font-medium text-foreground">{action.label}</span>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground", action.color)}>
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
