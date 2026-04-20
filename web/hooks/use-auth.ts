"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/fetch";

type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  civicPoints: number;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [meRes, tokenRes] = await Promise.all([
            apiFetch<{ success: boolean; user: AuthUser }>("/api/auth/me").catch(() => null),
            apiFetch<{ success: boolean; token: string | null }>("/api/auth/token").catch(() => null),
        ]);

        if (cancelled) return;

        setState({
            user: meRes?.user ?? null,
            token: tokenRes?.token ?? null,
            loading: false,
        });
      } catch {
        if (!cancelled) setState({ user: null, token: null, loading: false });
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return state;
}