import { apiFetch } from "@/lib/fetch";
import type { ModerationCase, ModerationStatus } from "@/components/admin/types";

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

type BackendItem = {
  id: number;
  title: string;
  description: string;
  location?: string;
  value_tier: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CLAIMED" | "RESOLVED";
  created_at: string;
  reporter?: BackendReporter | null;
};

const moderationStatusByBackendStatus: Record<BackendItem["status"], ModerationStatus> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLAIMED: "Approved",
  RESOLVED: "Approved",
};

const backendStatusByModerationStatus: Record<ModerationStatus, "APPROVED" | "REJECTED"> = {
  Approved: "APPROVED",
  Rejected: "REJECTED",
  Pending: "APPROVED",
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
  };
}

export async function fetchModerationCases() {
  const response = await apiFetch<BackendApiResponse<BackendItem[]>>("/api/lost-found");
  return response.data.map(mapBackendItemToModerationCase);
}

export async function fetchModerationCaseById(id: string) {
  const response = await apiFetch<BackendApiResponse<BackendItem>>(`/api/lost-found/${id}`);
  return mapBackendItemToModerationCase(response.data);
}

export async function patchModerationCaseStatus(id: string, status: Exclude<ModerationStatus, "Pending">, rejectionReason?: string) {
  const payload: { status: "APPROVED" | "REJECTED"; rejection_reason?: string } = {
    status: backendStatusByModerationStatus[status],
  };

  if (status === "Rejected" && rejectionReason?.trim()) {
    payload.rejection_reason = rejectionReason.trim();
  }

  await apiFetch(`/api/lost-found/${id}`, {
    method: "PATCH",
    body: payload,
  });
}
