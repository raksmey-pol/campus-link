import { apiFetch } from "@/lib/fetch";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SwapType = "SECTION" | "COURSE";
export type SwapStatus = "OPEN" | "MATCHED" | "ACCEPTED" | "COMPLETED" | "EXPIRED" | "CANCELLED";
export type MatchType = "DIRECT" | "CHAIN";
export type MatchStatus = "PROPOSED" | "ACCEPTED" | "COMPLETED" | "DECLINED";

// ─── Backend shapes ───────────────────────────────────────────────────────────

export type BackendCourse = {
  id: number;
  code: string;
  title: string;
};

export type BackendUser = {
  id: number;
  display_name: string;
  avatar_url: string | null;
};

export type BackendSwapRequest = {
  id: number;
  requester: BackendUser;
  swap_type: SwapType;
  current_course: BackendCourse;
  current_section: string | null;
  desired_course: BackendCourse | null;
  desired_section: string | null;
  notes: string | null;
  status: SwapStatus;
  expires_at: string;
  created_at: string;
};

export type BackendConfirmation = {
  id: number;
  user: BackendUser;
  confirmed_at: string;
};

export type BackendSwapMatch = {
  id: number;
  match_type: MatchType;
  status: MatchStatus;
  created_at: string;
  requestA: BackendSwapRequest;
  requestB: BackendSwapRequest;
  requestC: BackendSwapRequest | null;
  confirmations: BackendConfirmation[];
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
};

// ─── List params ──────────────────────────────────────────────────────────────

export type ListSwapsParams = {
  type?: SwapType;
  course_id?: number;
  section?: string;
  status?: SwapStatus;
  page?: number;
  limit?: number;
};

export type CreateSwapPayload = {
  swap_type: SwapType;
  current_course_id: number;
  current_section?: string;
  desired_course_id?: number;
  desired_section?: string;
  notes?: string;
};

// ─── Service functions ────────────────────────────────────────────────────────

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  return q.toString();
}

export async function fetchSwaps(params?: ListSwapsParams) {
  const qs = params ? buildQuery(params as Record<string, string | number | undefined>) : "";
  const res = await apiFetch<ApiResponse<BackendSwapRequest[]>>(
    `/api/swap${qs ? `?${qs}` : ""}`,
  );
  return {
    data: Array.isArray(res.data) ? res.data : [],
    meta: res.meta,
  };
}

export async function fetchMySwaps() {
  const res = await apiFetch<ApiResponse<BackendSwapRequest[]>>("/api/swap/mine");
  return res.data;
}

export async function fetchSwapById(id: number) {
  const res = await apiFetch<ApiResponse<BackendSwapRequest>>(`/api/swap/${id}`);
  return res.data;
}

export async function createSwap(payload: CreateSwapPayload) {
  const res = await apiFetch<ApiResponse<BackendSwapRequest>>("/api/swap", {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
  return res.data;
}

export async function cancelSwap(id: number) {
  await apiFetch(`/api/swap/${id}/cancel`, { method: "PATCH" });
}

export async function fetchMyMatches() {
  const res = await apiFetch<ApiResponse<BackendSwapMatch[]>>("/api/swap/matches");
  return res.data;
}

export async function fetchMatchById(matchId: number) {
  const res = await apiFetch<ApiResponse<BackendSwapMatch>>(`/api/swap/matches/${matchId}`);
  return res.data;
}

export async function confirmMatch(matchId: number) {
  await apiFetch(`/api/swap/matches/${matchId}/confirm`, { method: "PATCH" });
}

export async function declineMatch(matchId: number) {
  await apiFetch(`/api/swap/matches/${matchId}/decline`, { method: "PATCH" });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatExpiresAt(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d left`;
  return `${hours}h left`;
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}