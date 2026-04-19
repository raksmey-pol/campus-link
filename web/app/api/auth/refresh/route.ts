import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieNames, setSessionCookies } from "@/lib/auth/session";
import { getApiUrl } from "@/lib/config";
import { getAuthResponse, extractErrorMessage } from "@/lib/bff/auth";

export async function POST(request: NextRequest) {
  try {
    const cookieNames = getSessionCookieNames();
    const refreshToken = request.cookies.get(cookieNames.refresh)?.value;

    if (!refreshToken) {
      return NextResponse.json({ success: false, message: "Missing refresh token" }, { status: 401 });
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
      return NextResponse.json(
        {
          success: false,
          message: extractErrorMessage(payload, "Unable to refresh session"),
        },
        { status: response.status },
      );
    }

    const authPayload = getAuthResponse(payload);
    if (!authPayload || !authPayload.accessToken || !authPayload.refreshToken || !authPayload.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unexpected refresh response from backend",
        },
        { status: 502 },
      );
    }

    const bffResponse = NextResponse.json(
      {
        success: true,
        user: authPayload.user,
      },
      { status: 200 },
    );

    setSessionCookies(bffResponse, {
      accessToken: authPayload.accessToken,
      refreshToken: authPayload.refreshToken,
    });

    return bffResponse;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unexpected refresh proxy error",
      },
      { status: 500 },
    );
  }
}
