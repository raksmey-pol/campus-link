import { apiFetch } from "@/lib/fetch";

export interface CourseResource {
  id: number;
  type: "NOTES" | "PAST_ASSESSMENT" | "EXTERNAL_LINK" | "PROJECT_EXAMPLE";
  title: string;
  description?: string;
  file_url?: string;
  link_url?: string;
  upvotes: number;
  downvotes: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  user: {
    id: number;
    display_name: string;
  };
}

export interface CreateResourcePayload {
  type: "NOTES" | "PAST_ASSESSMENT" | "EXTERNAL_LINK" | "PROJECT_EXAMPLE";
  title: string;
  description?: string;
  file_url?: string;
  link_url?: string;
}

export interface VoteResourcePayload {
  vote: "UP" | "DOWN";
}

export interface ResourcesListResponse {
  data: CourseResource[];
  total: number;
  page: number;
}

export async function fetchResources(
  courseId: number,
  page: number = 1
): Promise<ResourcesListResponse> {
  const url = `/api/courses/${courseId}/resources?page=${page}`;
  const response = await apiFetch<{
    data: CourseResource[];
    total: number;
    page: number;
  }>(url);

  return {
    data: response.data || [],
    total: response.total || 0,
    page: response.page || 1,
  };
}

export async function createResource(
  courseId: number,
  payload: CreateResourcePayload | FormData
): Promise<CourseResource> {
  const options: any = {
    method: "POST",
  };

  if (payload instanceof FormData) {
    // For FormData, don't set Content-Type header (browser will set it automatically)
    options.body = payload;
  } else {
    // For JSON, stringify and set Content-Type
    options.body = JSON.stringify(payload);
  }

  const response = await apiFetch<CourseResource>(
    `/api/courses/${courseId}/resources`,
    options
  );

  return response;
}

export async function voteResource(
  resourceId: number,
  vote: "UP" | "DOWN"
): Promise<CourseResource> {
  const response = await apiFetch<CourseResource>(
    `/api/resources/${resourceId}/vote`,
    {
      method: "POST",
      body: JSON.stringify({ vote }),
    }
  );

  return response;
}

export async function deleteResource(resourceId: number): Promise<void> {
  await apiFetch(`/api/resources/${resourceId}`, {
    method: "DELETE",
  });
}

export async function updateResourceStatus(
  resourceId: number,
  status: "APPROVED" | "REJECTED"
): Promise<CourseResource> {
  const response = await apiFetch<CourseResource>(
    `/api/resources/${resourceId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  return response;
}
