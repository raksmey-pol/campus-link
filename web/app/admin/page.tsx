import { AlertTriangle, ArrowUpRight, BadgeCheck, Clock3, Shuffle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  dashboardStats,
  pointsIssued,
  recentActivity,
  recentUsers,
} from "@/components/admin/mock-data";

export const metadata = {
  title: "Admin Dashboard | CampusLink",
  description: "CampusLink admin overview dashboard",
};

const statToneClass: Record<(typeof dashboardStats)[number]["tone"], string> = {
  danger: "bg-destructive/10 text-destructive",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  neutral: "bg-muted text-muted-foreground",
};

const activityIconClass: Record<(typeof recentActivity)[number]["type"], string> = {
  review: "bg-warning/10 text-warning",
  "lost-found": "bg-destructive/10 text-destructive",
  swap: "bg-primary/10 text-primary",
};

const activityIcon = {
  review: Star,
  "lost-found": AlertTriangle,
  swap: Shuffle,
} as const;

export default function AdminDashboardPage() {
  return (
    <AdminShell active="overview" title="CampusLink Admin Dashboard">
      <div className="space-y-6 lg:space-y-8">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <article key={stat.title} className="rounded-2xl bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{stat.title}</p>
                <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", statToneClass[stat.tone])}>
                  {stat.tone === "danger" && <AlertTriangle className="h-5 w-5" />}
                  {stat.tone === "primary" && <BadgeCheck className="h-5 w-5" />}
                  {stat.tone === "warning" && <Star className="h-5 w-5" />}
                  {stat.tone === "neutral" && <Shuffle className="h-5 w-5" />}
                </span>
              </div>
              <p className="mt-4 text-4xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              <p className={cn("mt-1 text-xs font-medium", stat.tone === "danger" ? "text-destructive" : "text-muted-foreground")}>
                {stat.tone === "danger" && <ArrowUpRight className="mr-1 inline h-3 w-3" />}
                {stat.note}
              </p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <article className="overflow-hidden rounded-2xl bg-card shadow-card xl:col-span-8">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="text-xl font-bold text-primary">Recent Activity</h2>
              <Button variant="ghost" className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                View All
              </Button>
            </div>
            <div>
              {recentActivity.map((item, index) => {
                const Icon = activityIcon[item.type];
                return (
                  <div
                    key={item.title}
                    className={cn(
                      "flex flex-col gap-4 px-6 py-5 transition-colors md:flex-row md:items-center md:justify-between",
                      index % 2 === 1 ? "bg-muted/30" : "bg-card",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full", activityIconClass[item.type])}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" className="h-8 rounded-lg">Reject</Button>
                      <Button size="sm" className="h-8 rounded-lg">Approve</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl bg-card p-6 shadow-card xl:col-span-4">
            <h2 className="text-xl font-bold text-primary">Points Issued This Week</h2>
            <div className="mt-8 space-y-6">
              {pointsIssued.map((row, index) => (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <span>{row.label}</span>
                    <span className="text-primary">{row.points} pts</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        index === 0 ? "bg-primary" : index === 1 ? "bg-warning" : "bg-brand-blue/85",
                      )}
                      style={{ width: `${row.width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs italic text-muted-foreground">
              Average of 132 points per active user this semester.
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <h2 className="text-xl font-bold text-primary">Recent Users</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                <Clock3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-muted/50 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Civic Score</th>
                  <th className="px-6 py-4">Join Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user, index) => (
                  <tr key={user.email} className={cn(index % 2 === 1 && "bg-muted/20", "border-t border-border") }>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {user.initials}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 rounded-full bg-muted">
                          <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(user.score / 10, 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-success">{user.score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                          user.status === "Approved" && "border-l-2 border-success bg-success/10 text-success",
                          user.status === "Pending" && "bg-warning/20 text-warning",
                          user.status === "Rejected" && "bg-destructive/10 text-destructive",
                        )}
                      >
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
