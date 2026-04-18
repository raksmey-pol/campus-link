const DEFAULT_API_URL = "http://localhost:8000";

export function getApiUrl() {
  const baseUrl = process.env.API_URL ?? DEFAULT_API_URL;
  return baseUrl.replace(/\/+$/, "");
}
