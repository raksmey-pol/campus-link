import { apiFetch } from "@/lib/fetch";

export interface Course {
  id: number;
  code: string;
  title: string;
  department: string;
  credits: number;
  avgDifficulty?: number;
  avgQuality?: number;
  avgWorkload?: number;
  avgUsefulness?: number;
  reviewCount?: number;
  description?: string;
}

export interface CoursesListOptions {
  q?: string;
  dept?: string;
  sort?: string;
  page?: number;
}

export interface CoursesListResponse {
  items: Course[];
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchCourses(
  options: CoursesListOptions = {}
): Promise<CoursesListResponse> {
  const searchParams = new URLSearchParams();

  if (options.q) {
    searchParams.set("q", options.q);
  }

  if (options.dept) {
    searchParams.set("dept", options.dept);
  }

  if (options.sort) {
    searchParams.set("sort", options.sort);
  }

  if (options.page) {
    searchParams.set("page", String(options.page));
  }

  const queryString = searchParams.toString();
  const url = `/api/courses${queryString ? `?${queryString}` : ""}`;

  const response = await apiFetch<any>(url);

  return {
    items: response.data || [],
    meta: response.meta,
  };
}

export async function fetchCourseById(id: number | string): Promise<Course> {
  const response = await apiFetch<any>(`/api/courses/${id}`);
  return response.data || response;
}
