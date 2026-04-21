"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  BookOpen,
  ArrowLeftRight,
  Bell,
  User,
  Award,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthUserProfile } from "@/lib/bff/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: Search, label: "Lost", path: "/lost-found" },
  { icon: BookOpen, label: "Courses", path: "/courses" },
  { icon: ArrowLeftRight, label: "Swap", path: "/swap" },
  { icon: User, label: "Profile", path: "/profile" },
];

type AuthMeResponse = {
  success?: boolean;
  user?: AuthUserProfile;
};

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navExpanded, setNavExpanded] = useState(false);
  const [userProfile, setUserProfile] = useState<AuthUserProfile | null>(null);
  const lastScrollY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const handleScroll = () => {
      const currentY = el.scrollTop;
      // Scrolling down → expand (show labels), scrolling up → collapse (icons only)
      if (currentY > lastScrollY.current && currentY > 20) {
        setNavExpanded(true);
      } else if (currentY < lastScrollY.current) {
        setNavExpanded(false);
      }
      lastScrollY.current = currentY;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (isMounted) {
            setUserProfile(null);
          }
          return;
        }

        const payload = (await response
          .json()
          .catch(() => null)) as AuthMeResponse | null;
        if (isMounted) {
          setUserProfile(payload?.user ?? null);
        }
      } catch {
        if (isMounted) {
          setUserProfile(null);
        }
      }
    }

    const refreshUserProfile = () => {
      void loadCurrentUser();
    };

    refreshUserProfile();

    const refreshIntervalId = window.setInterval(refreshUserProfile, 60_000);
    window.addEventListener("focus", refreshUserProfile);

    return () => {
      isMounted = false;
      window.clearInterval(refreshIntervalId);
      window.removeEventListener("focus", refreshUserProfile);
    };
  }, []);

  const isAuthenticated = Boolean(userProfile);
  const profileName = isAuthenticated
    ? userProfile?.displayName || "Student User"
    : "Guest User";
  const profileSecondaryText = isAuthenticated
    ? userProfile?.email || "Signed in"
    : "Sign in to continue";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-card shadow-card">
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-sm font-bold text-primary-foreground">
              CL
            </span>
          </div>
          <span className="text-lg font-bold text-foreground">CampusLink</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 pt-4">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", active && "stroke-[2.5]")}
                />
                {item.label === "Home"
                  ? "Dashboard"
                  : item.label === "Lost"
                    ? "Lost & Found"
                    : item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          {isAuthenticated ? (
            <div className="space-y-3 rounded-2xl bg-surface p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {profileName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profileSecondaryText}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-warning">
                  <Award className="h-3.5 w-3.5" />
                  <span>{userProfile?.civicPoints ?? 0}</span>
                </div>
              </div>

              <SignOutButton
                onSignedOut={() => setUserProfile(null)}
                className="w-full gap-2 border border-border/70 bg-background text-foreground hover:bg-accent"
                pendingLabel="Signing out..."
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </SignOutButton>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 rounded-2xl bg-surface p-3 transition-colors hover:bg-accent"
              aria-label="Go to login"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profileName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profileSecondaryText}
                </p>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
        {/* Desktop header */}
        <header className="hidden lg:flex h-16 items-center gap-4 bg-card shadow-card px-6">
          <div className="flex-1" />
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              3
            </span>
          </button>
        </header>

        {/* Mobile header */}
        <header className="flex lg:hidden h-14 items-center justify-between bg-card px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
              <span className="text-xs font-bold text-primary-foreground">
                CL
              </span>
            </div>
            <span className="text-base font-bold text-foreground">
              CampusLink
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
              <Award className="h-3.5 w-3.5" />
              <span>{userProfile?.civicPoints ?? 0}</span>
            </div>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted-foreground">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                3
              </span>
            </button>
          </div>
        </header>

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6 pb-24 lg:pb-6"
        >
          <div className="animate-fade-in max-w-4xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Nav - expands on scroll down, collapses on scroll up */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex lg:hidden bg-card/95 backdrop-blur-lg safe-bottom transition-all duration-300 ease-in-out",
          navExpanded
            ? "shadow-[0_-4px_24px_-4px_hsl(200_20%_12%/0.12)] rounded-t-3xl mx-2 mb-1 px-2"
            : "shadow-[0_-2px_10px_-2px_hsl(200_20%_12%/0.06)]",
        )}
      >
        {navItems.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-300",
                navExpanded ? "py-3" : "py-2 pt-2.5",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-2xl transition-all duration-300",
                  navExpanded
                    ? active
                      ? "h-11 w-11 bg-primary/10"
                      : "h-11 w-11"
                    : active
                      ? "h-8 w-8 bg-primary/10"
                      : "h-8 w-8",
                )}
              >
                <item.icon
                  className={cn(
                    "transition-all duration-300",
                    navExpanded ? "h-5.5 w-5.5" : "h-5 w-5",
                    active && "stroke-[2.5]",
                  )}
                />
              </div>
              <span
                className={cn(
                  "font-medium transition-all duration-300 overflow-hidden",
                  navExpanded
                    ? "text-[11px] opacity-100 max-h-4 mt-0.5"
                    : "text-[0px] opacity-0 max-h-0",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
