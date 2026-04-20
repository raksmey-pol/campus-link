import Link from "next/link";
import {
  Bell,
  BookOpen,
  Briefcase,
  ChartColumnIncreasing,
  CircleHelp,
  FileSpreadsheet,
  LogOut,
  PlusCircle,
  Search,
  Shuffle,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignOutButton } from "@/components/auth/SignOutButton";
import type { AdminNavKey } from "./types";
import Image from "next/image";

type AdminShellProps = {
  children: React.ReactNode;
  title: string;
  active: AdminNavKey;
};

const navItems: Array<{
  key: AdminNavKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: "overview",
    label: "Overview",
    href: "/admin",
    icon: ChartColumnIncreasing,
  },
  {
    key: "lost-found",
    label: "Lost & Found",
    href: "/admin/lost-found",
    icon: Briefcase,
  },
  { key: "course-reviews", label: "Course Reviews", href: "#", icon: BookOpen },
  { key: "swap-board", label: "Swap Board", href: "#", icon: Shuffle },
  { key: "users", label: "Users", href: "#", icon: Users },
  { key: "point-ledger", label: "Point Ledger", href: "#", icon: Wallet },
  { key: "reports", label: "Reports/Export", href: "#", icon: FileSpreadsheet },
];

export function AdminShell({ children, title, active }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[hsl(var(--surface))]">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col bg-primary text-primary-foreground">
        <div className="px-8 py-4">
          <Image
            src="/logo/logo.png"
            alt="CampusLink Logo"
            width={180}
            height={180}
            className="mr-2 inline"
          />
        </div>

        <nav className="px-4">
          {navItems.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "mt-1 flex items-center gap-3 rounded-r-lg border-l-4 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-l-[hsl(var(--warning))] bg-white/10 text-white"
                    : "border-l-transparent text-primary-foreground/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-6 pb-6">
          <Button className="h-11 w-full bg-[hsl(var(--warning))] text-white hover:bg-[hsl(var(--warning))]/90">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Report
          </Button>

          <SignOutButton
            className="mt-3 h-11 w-full gap-2 border border-white/20 bg-transparent text-primary-foreground hover:bg-white/10"
            pendingLabel="Signing out..."
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </SignOutButton>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm font-semibold">Dr. Aris Thorne</p>
            <p className="text-xs text-primary-foreground/70">
              Senior Moderator
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:ml-72">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div>
              {/* <p className="text-xs text-muted-foreground">/</p> */}
              <h1 className="text-sm font-bold text-primary sm:text-base">
                {title}
              </h1>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 w-64 rounded-full bg-muted/60 pl-9"
                  placeholder="Global university search..."
                />
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-4.5 w-4.5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <CircleHelp className="h-4.5 w-4.5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
