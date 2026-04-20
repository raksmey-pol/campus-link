const DEFAULT_API_URL = "http://localhost:8000/api";

function normalizeApiBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  const withProtocol =
    /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) || trimmed.startsWith("/")
      ? trimmed
      : `http://${trimmed}`;

  return /\/api$/i.test(withProtocol) ? withProtocol : `${withProtocol}/api`;
}

export function getApiUrl() {
  const baseUrl =
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
  return normalizeApiBaseUrl(baseUrl);
}