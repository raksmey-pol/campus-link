export class ApiFetchError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

type AuthRefreshResponse = {
  success?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !(value instanceof FormData) && !(value instanceof URLSearchParams);
}

function isAuthEndpoint(url: string) {
  return /\/api\/auth\/(login|register|google|refresh|logout|logout-all|me)(?:\/|$)/.test(url);
}

let _refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    headers: { accept: "application/json" },
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) return false;
      const payload = (await response.json().catch(() => null)) as AuthRefreshResponse | null;
      return payload?.success !== false;
    })
    .catch(() => false)
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}

export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");

  let body: BodyInit | undefined;
  if (isPlainObject(options.body)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.body);
  } else if (options.body instanceof FormData || options.body instanceof URLSearchParams || typeof options.body === "string") {
    body = options.body;
  }

  const requestInit: RequestInit = {
    ...options,
    headers,
    body,
    cache: options.cache ?? "no-store",
  };

  let response = await fetch(url, requestInit);

  if (response.status === 401 && !isAuthEndpoint(url)) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await fetch(url, requestInit);
    }
  }

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string } | null)?.message ??
      `Request failed with status ${response.status}`;
    throw new ApiFetchError(message, response.status, payload);
  }

  return payload as T;
}
