import { apiFetch } from "@/lib/fetch";

export type AdminCourseReference = {
  id: number;
  code: string;
  title: string;
  department: string;
};

export type AdminUserReference = {
  id: number;
  display_name: string;
};

export type AdminCommunitySummary = {
  totalPending: number;
  reviews: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  resources: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  questions: {
    totalQuestions: number;
    openQuestions: number;
    pinnedQuestions: number;
    closedQuestions: number;
    totalAnswers: number;
  };
};

export type AdminReviewModerationItem = {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  difficulty: number;
  workload_hours: number;
  quality: number;
  usefulness: number;
  recommendation: number;
  review_text: string | null;
  is_anonymous: boolean;
  helpfulness_votes: number;
  created_at: string;
  updated_at: string;
  user: AdminUserReference;
  course: AdminCourseReference;
};

export type AdminResourceModerationItem = {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: "NOTES" | "PAST_ASSESSMENT" | "EXTERNAL_LINK" | "PROJECT_EXAMPLE";
  title: string;
  description: string | null;
  file_url: string | null;
  link_url: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  user: AdminUserReference;
  course: AdminCourseReference;
};

export type AdminQuestionModerationItem = {
  id: number;
  title: string;
  body: string;
  view_count: number;
  answer_count: number;
  is_pinned: boolean;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  user: AdminUserReference;
  course: AdminCourseReference;
};

export type AdminAnswerModerationItem = {
  id: number;
  body: string;
  upvotes: number;
  downvotes: number;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  user: AdminUserReference;
};

export type AdminQuestionModerationDetail = AdminQuestionModerationItem & {
  answers: AdminAnswerModerationItem[];
};

type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchAdminCommunitySummary() {
  return apiFetch<AdminCommunitySummary>("/api/admin/course-community/summary");
}

export async function fetchAdminReviews(params: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  search?: string;
  page?: number;
}) {
  return apiFetch<PaginatedResponse<AdminReviewModerationItem>>(
    `/api/admin/course-community/reviews${buildQuery(params)}`
  );
}

export async function fetchAdminResources(params: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  type?: "NOTES" | "PAST_ASSESSMENT" | "EXTERNAL_LINK" | "PROJECT_EXAMPLE";
  search?: string;
  page?: number;
}) {
  return apiFetch<PaginatedResponse<AdminResourceModerationItem>>(
    `/api/admin/course-community/resources${buildQuery(params)}`
  );
}

export async function fetchAdminQuestions(params: {
  state?: "ALL" | "OPEN" | "PINNED" | "CLOSED";
  search?: string;
  courseId?: number;
  page?: number;
}) {
  return apiFetch<PaginatedResponse<AdminQuestionModerationItem>>(
    `/api/admin/course-community/questions${buildQuery(params)}`
  );
}

export async function fetchAdminQuestionDetail(questionId: number | string) {
  return apiFetch<AdminQuestionModerationDetail>(
    `/api/admin/course-community/questions/${questionId}`
  );
}
