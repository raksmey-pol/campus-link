import { apiFetch } from "@/lib/fetch";

export interface Course {
  id: number;
  code: string;
  title: string;
  department: string;
  credits: number;
  prerequisites?: string;
  description?: string;
  avg_difficulty?: number;
  avg_workload?: number;
  avg_quality?: number;
  avg_usefulness?: number;
  avg_recommendation?: number;
  review_count?: number;
  // Legacy camelCase support
  avgDifficulty?: number;
  avgQuality?: number;
  avgWorkload?: number;
  avgUsefulness?: number;
  reviewCount?: number;
}

export interface CoursesListOptions {
  q?: string;
  dept?: string;
  sort?: string;
  page?: number;
}

export interface CoursesListResponse {
  data: Course[];
  total: number;
  page: number;
  pageCount?: number;
}

// Helper to normalize API response to frontend format
function normalizeCourse(course: any): Course {
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    department: course.department,
    credits: course.credits,
    prerequisites: course.prerequisites,
    description: course.description,
    avg_difficulty: parseFloat(course.avg_difficulty) || 0,
    avg_workload: parseFloat(course.avg_workload) || 0,
    avg_quality: parseFloat(course.avg_quality) || 0,
    avg_usefulness: parseFloat(course.avg_usefulness) || 0,
    avg_recommendation: parseFloat(course.avg_recommendation) || 0,
    review_count: parseInt(course.review_count) || 0,
    // Legacy support
    avgDifficulty: parseFloat(course.avg_difficulty) || 0,
    avgQuality: parseFloat(course.avg_quality) || 0,
    avgWorkload: parseFloat(course.avg_workload) || 0,
    avgUsefulness: parseFloat(course.avg_usefulness) || 0,
    reviewCount: parseInt(course.review_count) || 0,
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

  const response = await apiFetch<{
    data: any[];
    total: number;
    page: number;
    pageCount: number;
  }>(url);

  return {
    data: (response.data || []).map(normalizeCourse),
    total: response.total,
    page: response.page,
    pageCount: response.pageCount,
  };
}

export async function fetchCourseById(id: number | string): Promise<Course> {
  const response = await apiFetch<Course>(`/api/courses/${id}`);
  return normalizeCourse(response);
}
