import { NextRequest } from "next/server";
import { getSessionCookieNames } from "@/lib/auth/session";
import { getApiUrl } from "@/lib/config";

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

type RefreshPayload =
  | { accessToken?: string; refreshToken?: string }
  | { data?: { accessToken?: string; refreshToken?: string } }
  | null;

function normalizeRefreshPayload(payload: RefreshPayload): SessionTokens | null {
  if (!payload) {
    return null;
  }

  if ("accessToken" in payload) {
    return payload.accessToken && payload.refreshToken
      ? {
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        }
      : null;
  }

  if (!("data" in payload)) {
    return null;
  }

  const data = payload.data;

  if (!data?.accessToken || !data.refreshToken) {
    return null;
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

export async function refreshSessionFromCookie(request: NextRequest): Promise<SessionTokens | null> {
  const cookieNames = getSessionCookieNames();
  const refreshToken = request.cookies.get(cookieNames.refresh)?.value;

  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as RefreshPayload;

  return normalizeRefreshPayload(payload);
}
