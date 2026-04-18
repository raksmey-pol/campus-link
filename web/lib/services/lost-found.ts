import { apiFetch } from "@/lib/fetch";
import type { BackendClaim, ModerationCase, ModerationStatus } from "@/components/admin/types";

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

type BackendReporter = {
  display_name?: string | null;
};

type BackendItemStatus = "PENDING" | "APPROVED" | "REJECTED" | "CLAIMED" | "RESOLVED";

type BackendItem = {
  id: number;
  title: string;
  description: string;
  location?: string;
  value_tier: string;
  status: BackendItemStatus;
  created_at: string;
  reporter?: BackendReporter | null;
  claim_summary?: {
    total_claims: number;
    pending_claims: number;
    approved_claims: number;
    rejected_claims: number;
    latest_claim_submitted_at: string | null;
  };
  resolve_state?: {
    is_resolved: boolean;
    finder_confirmed: boolean;
    claimer_confirmed: boolean;
    resolved_at: string | null;
  };
};

const moderationStatusByBackendStatus: Record<BackendItemStatus, ModerationStatus> = {
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
  const reporterName = item.reporter?.display_name?.trim() || "Unknown Reporter";
  const location = item.location?.trim() || "Location unavailable";

  return {
    id: String(item.id),
    item: item.title,
    location,
    tier: item.value_tier.replaceAll("_", " "),
    reporter: reporterName,
    initials: toInitials(reporterName),
    submittedAt: formatDate(item.created_at),
    aiStatus: "Passed",
    status: moderationStatusByBackendStatus[item.status] ?? "Pending",
    description: item.description,
    timeFound: formatDate(item.created_at),
    casePriority: item.value_tier === "VERY_HIGH" || item.value_tier === "HIGH" ? "High Priority" : "Normal Priority",
    aiMatch: 0,
    objectRecognition: "Not Available",
    policyRisk: "Not Available",
    locationContext: "Not Available",
    claimSummary: item.claim_summary
      ? {
          totalClaims: item.claim_summary.total_claims,
          pendingClaims: item.claim_summary.pending_claims,
          approvedClaims: item.claim_summary.approved_claims,
          rejectedClaims: item.claim_summary.rejected_claims,
        }
      : undefined,
    resolveState: item.resolve_state
      ? {
          isResolved: item.resolve_state.is_resolved,
          finderConfirmed: item.resolve_state.finder_confirmed,
          claimerConfirmed: item.resolve_state.claimer_confirmed,
          resolvedAt: item.resolve_state.resolved_at,
        }
      : undefined,
  };
}

// ── Item moderation ────────────────────────────────────────────────────────────

export async function fetchModerationCases() {
  const response = await apiFetch<BackendApiResponse<BackendItem[]>>("/api/lost-found");
  return response.data.map(mapBackendItemToModerationCase);
}

export async function fetchModerationCaseById(id: string) {
  const response = await apiFetch<BackendApiResponse<BackendItem>>(`/api/lost-found/${id}`);
  return mapBackendItemToModerationCase(response.data);
}

export async function patchModerationCaseStatus(
  id: string,
  status: Extract<ModerationStatus, "Approved" | "Rejected">,
  rejectionReason?: string,
) {
  const payload: { status: "APPROVED" | "REJECTED"; rejection_reason?: string } = {
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

// ── Claim management ───────────────────────────────────────────────────────────

export async function fetchItemClaims(itemId: string): Promise<BackendClaim[]> {
  const response = await apiFetch<BackendApiResponse<BackendClaim[]>>(`/api/lost-found/${itemId}/claims`);
  return response.data;
}

export async function patchClaimStatus(
  itemId: string,
  claimId: number,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string,
): Promise<void> {
  const payload: { status: "APPROVED" | "REJECTED"; rejection_reason?: string } = { status };

  if (status === "REJECTED" && rejectionReason?.trim()) {
    payload.rejection_reason = rejectionReason.trim();
  }

  await apiFetch(`/api/lost-found/${itemId}/claims/${claimId}`, {
    method: "PATCH",
    body: payload,
  });
}

// ── Resolution ─────────────────────────────────────────────────────────────────

export async function resolveItem(itemId: string): Promise<{ resolved: boolean; message: string }> {
  const response = await apiFetch<BackendApiResponse<{ resolved: boolean }> & { message: string }>(
    `/api/lost-found/${itemId}/resolve`,
    { method: "PATCH" },
  );
  return { resolved: response.data.resolved, message: response.message };
}
