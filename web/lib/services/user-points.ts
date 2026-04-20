import { apiFetch } from "@/lib/fetch";

type BackendApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
};

type BackendPointHistoryEntry = {
  id: number;
  amount: number;
  type: string;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string;
};

type BackendPointHistory = {
  civicPoints: number;
  transactions: BackendPointHistoryEntry[];
  pagination?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  filter?: {
    type?: UserPointType | "ALL";
  };
};

export type UserPointType =
  | "FINDER_REWARD"
  | "TRUST_CONFIRM"
  | "RESOURCE_UPLOAD"
  | "REVIEW_HELPFUL"
  | "QA_UPVOTE"
  | "MENTOR_BONUS"
  | "SWAP_COMPLETE";

export const USER_POINT_TYPE_OPTIONS: Array<{
  value: UserPointType | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All point types" },
  { value: "FINDER_REWARD", label: "Finder reward" },
  { value: "TRUST_CONFIRM", label: "Trust confirmation" },
  { value: "RESOURCE_UPLOAD", label: "Resource upload" },
  { value: "REVIEW_HELPFUL", label: "Helpful review" },
  { value: "QA_UPVOTE", label: "Q&A upvote" },
  { value: "MENTOR_BONUS", label: "Mentor bonus" },
  { value: "SWAP_COMPLETE", label: "Swap completed" },
];

export type UserPointHistoryEntry = {
  id: number;
  amount: number;
  type: string;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string;
};

export type UserPointHistory = {
  civicPoints: number;
  transactions: UserPointHistoryEntry[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filter: {
    type: UserPointType | "ALL";
  };
};

type FetchMyPointHistoryOptions = {
  page?: number;
  limit?: number;
  type?: UserPointType | "ALL";
};

export async function fetchMyPointHistory(
  options: FetchMyPointHistoryOptions = {},
): Promise<UserPointHistory> {
  const safePage = Number.isFinite(options.page)
    ? Math.max(Math.trunc(options.page ?? 1), 1)
    : 1;
  const safeLimit = Number.isFinite(options.limit)
    ? Math.min(Math.max(Math.trunc(options.limit ?? 20), 1), 50)
    : 20;
  const queryParams = new URLSearchParams();

  queryParams.set("page", String(safePage));
  queryParams.set("limit", String(safeLimit));

  if (options.type && options.type !== "ALL") {
    queryParams.set("type", options.type);
  }

  const response = await apiFetch<BackendApiResponse<BackendPointHistory>>(
    `/api/users/me/points?${queryParams.toString()}`,
  );

  const pagination = response.data.pagination;
  const resolvedTotalPages = Math.max(1, pagination?.totalPages ?? 1);
  const resolvedPage = Math.min(
    Math.max(1, pagination?.page ?? safePage),
    resolvedTotalPages,
  );

  return {
    civicPoints: response.data.civicPoints ?? 0,
    transactions: (response.data.transactions ?? []).map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      type: entry.type,
      referenceId: entry.referenceId ?? null,
      referenceType: entry.referenceType ?? null,
      createdAt: entry.createdAt,
    })),
    pagination: {
      page: resolvedPage,
      perPage: pagination?.perPage ?? safeLimit,
      total: pagination?.total ?? 0,
      totalPages: resolvedTotalPages,
      hasNext: pagination?.hasNext ?? resolvedPage < resolvedTotalPages,
      hasPrev: pagination?.hasPrev ?? resolvedPage > 1,
    },
    filter: {
      type: response.data.filter?.type ?? options.type ?? "ALL",
    },
  };
}
