const DEFAULT_PUBLIC_API_URL = "http://localhost:8000/api";

function normalizeApiBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  const withProtocol =
    /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) || trimmed.startsWith("/")
      ? trimmed
      : `http://${trimmed}`;

  return /\/api$/i.test(withProtocol) ? withProtocol : `${withProtocol}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_PUBLIC_API_URL,
);

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

// Convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  } else if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key);
      result[camelKey] = transformKeys(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

async function apiCall(endpoint: string, options: RequestOptions = {}) {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return transformKeys(data);
}

export const coursesApi = {
  listCourses: (params?: {
    q?: string;
    dept?: string;
    sort?: string;
    page?: number;
  }) => apiCall("/courses", { params }),
  getCourse: (id: number) => apiCall(`/courses/${id}`),
};
