import { apiFetch } from "@/lib/fetch";
import type {
  BackendClaim,
  ModerationCase,
  ModerationStatus,
} from "@/components/admin/types";

type BackendApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
  timestamp?: string;
};

type BackendClaimSummary = {
  total_claims?: number;
  pending_claims?: number;
  approved_claims?: number;
  rejected_claims?: number;
  latest_claim_submitted_at?: string | null;
};

type BackendResolveState = {
  is_resolved?: boolean;
  finder_confirmed?: boolean;
  claimer_confirmed?: boolean;
  resolved_at?: string | null;
};

type BackendReporter = {
  display_name?: string | null;
  avatar_url?: string | null;
};

type BackendItemStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CLAIMED"
  | "RESOLVED";

type BackendItem = {
  id: number;
  title: string;
  description: string;
  photo_url?: string | null;
  location?: string;
  value_tier: string;
  status: BackendItemStatus;
  created_at: string;
  updated_at?: string;
  reporter?: BackendReporter | null;
  claim_summary?: BackendClaimSummary;
  resolve_state?: BackendResolveState;
};

export type LostFoundFeedStatus = BackendItemStatus;
export type LostFoundValueTier = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type LostFoundFeedItem = {
  id: number;
  title: string;
  description: string;
  photoUrl: string | null;
  location: string;
  valueTier: LostFoundValueTier;
  status: LostFoundFeedStatus;
  createdAt: string;
  updatedAt: string | null;
  reporterName: string;
  reporterAvatarUrl: string | null;
  claimSummary: {
    totalClaims: number;
    pendingClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
    latestClaimSubmittedAt: string | null;
  };
  resolveState: {
    isResolved: boolean;
    finderConfirmed: boolean;
    claimerConfirmed: boolean;
    resolvedAt: string | null;
  };
};

export type LostFoundFeedMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

type FetchLostFoundFeedOptions = {
  page?: number;
  limit?: number;
  status?: LostFoundFeedStatus;
  valueTier?: LostFoundValueTier;
  location?: string;
};

const DEFAULT_PUBLIC_API_URL = "http://localhost:8000";

function getPublicApiBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_PUBLIC_API_URL;

  return raw.replace(/\/+$/, "");
}

function toPublicPhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(photoUrl)) {
    return photoUrl;
  }

  const normalizedPath = photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`;
  return `${getPublicApiBaseUrl()}${normalizedPath}`;
}

function normalizeValueTier(valueTier: string): LostFoundValueTier {
  const normalized = valueTier.trim().toUpperCase();

  if (
    normalized === "LOW" ||
    normalized === "MEDIUM" ||
    normalized === "HIGH" ||
    normalized === "VERY_HIGH"
  ) {
    return normalized;
  }

  return "MEDIUM";
}

function normalizeStatus(status: string): LostFoundFeedStatus {
  const normalized = status.trim().toUpperCase();

  if (
    normalized === "PENDING" ||
    normalized === "APPROVED" ||
    normalized === "REJECTED" ||
    normalized === "CLAIMED" ||
    normalized === "RESOLVED"
  ) {
    return normalized;
  }

  return "PENDING";
}

function normalizeMeta(
  meta?: BackendApiResponse<unknown>["meta"],
): LostFoundFeedMeta {
  return {
    page: meta?.page ?? 1,
    perPage: meta?.per_page ?? 0,
    total: meta?.total ?? 0,
    totalPages: meta?.total_pages ?? 0,
  };
}

function mapBackendItemToFeedItem(item: BackendItem): LostFoundFeedItem {
  const reporterName =
    item.reporter?.display_name?.trim() || "Campus Community";
  const normalizedStatus = normalizeStatus(item.status);
  const normalizedTier = normalizeValueTier(item.value_tier);
  const claimSummary = item.claim_summary;
  const resolveState = item.resolve_state;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    photoUrl: toPublicPhotoUrl(item.photo_url),
    location: item.location?.trim() || "Location shared after verification",
    valueTier: normalizedTier,
    status: normalizedStatus,
    createdAt: item.created_at,
    updatedAt: item.updated_at ?? null,
    reporterName,
    reporterAvatarUrl: item.reporter?.avatar_url?.trim() || null,
    claimSummary: {
      totalClaims: claimSummary?.total_claims ?? 0,
      pendingClaims: claimSummary?.pending_claims ?? 0,
      approvedClaims: claimSummary?.approved_claims ?? 0,
      rejectedClaims: claimSummary?.rejected_claims ?? 0,
      latestClaimSubmittedAt: claimSummary?.latest_claim_submitted_at ?? null,
    },
    resolveState: {
      isResolved: resolveState?.is_resolved ?? normalizedStatus === "RESOLVED",
      finderConfirmed: resolveState?.finder_confirmed ?? false,
      claimerConfirmed: resolveState?.claimer_confirmed ?? false,
      resolvedAt: resolveState?.resolved_at ?? null,
    },
  };
}

function buildFeedQuery(options: FetchLostFoundFeedOptions): string {
  const searchParams = new URLSearchParams();

  if (options.page) {
    searchParams.set("page", String(options.page));
  }

  if (options.limit) {
    searchParams.set("limit", String(options.limit));
  }

  if (options.status) {
    searchParams.set("status", options.status);
  }

  if (options.valueTier) {
    searchParams.set("value_tier", options.valueTier);
  }

  if (options.location?.trim()) {
    searchParams.set("location", options.location.trim());
  }

  return searchParams.toString();
}

const moderationStatusByBackendStatus: Record<
  LostFoundFeedStatus,
  ModerationStatus
> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLAIMED: "Claimed",
  RESOLVED: "Resolved",
};

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function mapBackendItemToModerationCase(item: BackendItem): ModerationCase {
  const feedItem = mapBackendItemToFeedItem(item);

  return {
    id: String(feedItem.id),
    item: feedItem.title,
    location: feedItem.location,
    tier: feedItem.valueTier.replaceAll("_", " "),
    reporter: feedItem.reporterName,
    initials: toInitials(feedItem.reporterName),
    submittedAt: formatDate(feedItem.createdAt),
    aiStatus: "Passed",
    status: moderationStatusByBackendStatus[feedItem.status] ?? "Pending",
    description: feedItem.description,
    timeFound: formatDate(feedItem.createdAt),
    casePriority:
      feedItem.valueTier === "VERY_HIGH" || feedItem.valueTier === "HIGH"
        ? "High Priority"
        : "Normal Priority",
    aiMatch: 0,
    objectRecognition: "Not Available",
    policyRisk: "Not Available",
    locationContext: "Not Available",
    claimSummary: item.claim_summary
      ? {
          totalClaims: item.claim_summary.total_claims ?? 0,
          pendingClaims: item.claim_summary.pending_claims ?? 0,
          approvedClaims: item.claim_summary.approved_claims ?? 0,
          rejectedClaims: item.claim_summary.rejected_claims ?? 0,
        }
      : undefined,
    resolveState: item.resolve_state
      ? {
          isResolved:
            item.resolve_state.is_resolved ?? feedItem.status === "RESOLVED",
          finderConfirmed: item.resolve_state.finder_confirmed ?? false,
          claimerConfirmed: item.resolve_state.claimer_confirmed ?? false,
          resolvedAt: item.resolve_state.resolved_at ?? null,
        }
      : undefined,
  };
}

export async function fetchLostFoundFeed(
  options: FetchLostFoundFeedOptions = {},
) {
  const query = buildFeedQuery({
    page: options.page,
    limit: options.limit ?? 50,
    status: options.status,
    valueTier: options.valueTier,
    location: options.location,
  });

  const requestUrl = query ? `/api/lost-found?${query}` : "/api/lost-found";
  const response =
    await apiFetch<BackendApiResponse<BackendItem[]>>(requestUrl);

  return {
    items: response.data.map(mapBackendItemToFeedItem),
    meta: normalizeMeta(response.meta),
  };
}

export async function fetchLostFoundFeedItemById(id: number | string) {
  const response = await apiFetch<BackendApiResponse<BackendItem>>(
    `/api/lost-found/${id}`,
  );
  return mapBackendItemToFeedItem(response.data);
}

export async function fetchModerationCases() {
  const response =
    await apiFetch<BackendApiResponse<BackendItem[]>>("/api/lost-found");
  return response.data.map(mapBackendItemToModerationCase);
}

export async function fetchModerationCaseById(id: string) {
  const response = await apiFetch<BackendApiResponse<BackendItem>>(
    `/api/lost-found/${id}`,
  );
  return mapBackendItemToModerationCase(response.data);
}

export async function patchModerationCaseStatus(
  id: string,
  status: Extract<ModerationStatus, "Approved" | "Rejected">,
  rejectionReason?: string,
) {
  const payload: {
    status: "APPROVED" | "REJECTED";
    rejection_reason?: string;
  } = {
    status: status === "Approved" ? "APPROVED" : "REJECTED",
  };

  if (status === "Rejected" && rejectionReason?.trim()) {
    payload.rejection_reason = rejectionReason.trim();
  }

  await apiFetch(`/api/lost-found/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function fetchItemClaims(itemId: string): Promise<BackendClaim[]> {
  const response = await apiFetch<BackendApiResponse<BackendClaim[]>>(
    `/api/lost-found/${itemId}/claims`,
  );
  return response.data;
}

export async function patchClaimStatus(
  itemId: string,
  claimId: number,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string,
): Promise<void> {
  const payload: {
    status: "APPROVED" | "REJECTED";
    rejection_reason?: string;
  } = { status };

  if (status === "REJECTED" && rejectionReason?.trim()) {
    payload.rejection_reason = rejectionReason.trim();
  }

  await apiFetch(`/api/lost-found/${itemId}/claims/${claimId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function resolveItem(
  itemId: string,
): Promise<{ resolved: boolean; message: string }> {
  const response = await apiFetch<BackendApiResponse<{ resolved: boolean }>>(
    `/api/lost-found/${itemId}/resolve`,
    { method: "PATCH" },
  );
  return { resolved: response.data.resolved, message: response.message };
}
