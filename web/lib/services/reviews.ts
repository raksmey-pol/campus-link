import { apiFetch } from "@/lib/fetch";

export interface CourseReview {
  id: number;
  difficulty: number;
  workload_hours: number;
  quality: number;
  usefulness: number;
  recommendation: number;
  review_text?: string;
  is_anonymous: boolean;
  helpfulness_votes: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    display_name: string;
  };
}

export interface CreateReviewPayload {
  difficulty: number;
  workload_hours: number;
  quality: number;
  usefulness: number;
  recommendation: number;
  review_text?: string;
  is_anonymous?: boolean;
}

export interface ReviewsListResponse {
  data: CourseReview[];
  total: number;
  page: number;
}

export async function fetchReviews(
  courseId: number,
  sort: "helpful" | "recent" = "recent",
  page: number = 1
): Promise<ReviewsListResponse> {
  const url = `/api/courses/${courseId}/reviews?sort=${sort}&page=${page}`;
  const response = await apiFetch<{
    data: CourseReview[];
    total: number;
    page: number;
  }>(url);

  return {
    data: response.data || [],
    total: response.total || 0,
    page: response.page || 1,
  };
}

export async function createReview(
  courseId: number,
  payload: CreateReviewPayload
): Promise<CourseReview> {
  const response = await apiFetch<CourseReview>(
    `/api/courses/${courseId}/reviews`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return response;
}

export async function voteReview(
  reviewId: number,
  isHelpful: boolean
): Promise<any> {
  const response = await apiFetch(
    `/api/reviews/${reviewId}/vote`,
    {
      method: "POST",
      body: JSON.stringify({ is_helpful: isHelpful }),
    }
  );

  return response;
}

export async function unvoteReview(reviewId: number): Promise<any> {
  const response = await apiFetch(
    `/api/reviews/${reviewId}/vote`,
    {
      method: "DELETE",
    }
  );

  return response;
}

export async function deleteReview(reviewId: number): Promise<void> {
  await apiFetch(`/api/reviews/${reviewId}`, {
    method: "DELETE",
  });
}
