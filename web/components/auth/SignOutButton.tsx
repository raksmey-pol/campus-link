"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  children?: ReactNode;
  label?: string;
  pendingLabel?: string;
  onSignedOut?: () => void;
};

export function SignOutButton({
  className,
  children,
  label = "Sign out",
  pendingLabel = "Signing out...",
  onSignedOut,
}: SignOutButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignOut() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          accept: "application/json",
        },
        credentials: "same-origin",
      });
    } catch {
      // If logout fails, still continue to login and let auth guards recover.
    }

    onSignedOut?.();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSubmitting}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      aria-label="Sign out"
    >
      {isSubmitting ? pendingLabel : (children ?? label)}
    </button>
  );
}
