import { apiFetch } from "@/lib/fetch";

export interface CourseQuestion {
  id: number;
  title: string;
  body: string;
  view_count: number;
  answer_count: number;
  is_pinned: boolean;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    display_name: string;
  };
}

export interface CourseAnswer {
  id: number;
  body: string;
  upvotes: number;
  downvotes: number;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    display_name: string;
  };
}

export interface QuestionDetail extends CourseQuestion {
  answers: CourseAnswer[];
}

export interface CreateQuestionPayload {
  title: string;
  body: string;
}

export interface CreateAnswerPayload {
  body: string;
}

export interface VoteAnswerPayload {
  vote_type: "UPVOTE" | "DOWNVOTE";
}

export interface QuestionsListResponse {
  data: CourseQuestion[];
  total: number;
  page: number;
}

export async function fetchQuestions(
  courseId: number,
  sort: "recent" | "most_viewed" | "unanswered" = "recent",
  page: number = 1
): Promise<QuestionsListResponse> {
  const url = `/api/courses/${courseId}/questions?sort=${sort}&page=${page}`;
  const response = await apiFetch<{
    data: CourseQuestion[];
    total: number;
    page: number;
  }>(url);

  return {
    data: response.data || [],
    total: response.total || 0,
    page: response.page || 1,
  };
}

export async function fetchQuestionDetail(
  questionId: number
): Promise<QuestionDetail> {
  const response = await apiFetch<QuestionDetail>(`/api/questions/${questionId}`);
  return response;
}

export async function createQuestion(
  courseId: number,
  payload: CreateQuestionPayload
): Promise<CourseQuestion> {
  const response = await apiFetch<CourseQuestion>(
    `/api/courses/${courseId}/questions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return response;
}

export async function createAnswer(
  questionId: number,
  payload: CreateAnswerPayload
): Promise<CourseAnswer> {
  const response = await apiFetch<CourseAnswer>(
    `/api/questions/${questionId}/answers`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return response;
}

export async function voteAnswer(
  questionId: number,
  answerId: number,
  payload: VoteAnswerPayload
): Promise<any> {
  const response = await apiFetch(
    `/api/questions/${questionId}/answers/${answerId}/vote`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return response;
}

export async function acceptAnswer(
  questionId: number,
  answerId: number,
  isAccepted: boolean
): Promise<CourseAnswer> {
  const response = await apiFetch<CourseAnswer>(
    `/api/questions/${questionId}/answers/${answerId}/accept`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_accepted: isAccepted }),
    }
  );

  return response;
}

export async function deleteQuestion(questionId: number): Promise<void> {
  await apiFetch(`/api/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function deleteAnswer(answerId: number): Promise<void> {
  await apiFetch(`/api/answers/${answerId}`, {
    method: "DELETE",
  });
}

export async function pinQuestion(
  questionId: number,
  isPinned: boolean
): Promise<CourseQuestion> {
  const response = await apiFetch<CourseQuestion>(
    `/api/questions/${questionId}/pin`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_pinned: isPinned }),
    }
  );

  return response;
}
