import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth/session";
import { getApiUrl } from "@/lib/config";
import { getAuthResponse, extractErrorMessage } from "@/lib/bff/auth";
import { getLoginRedirectPath } from "@/lib/auth/token";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };

    const response = await fetch(`${getApiUrl()}/auth/login`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
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
          message: extractErrorMessage(payload, "Login failed"),
        },
        { status: response.status },
      );
    }

    const authPayload = getAuthResponse(payload);
    if (!authPayload || !authPayload.accessToken || !authPayload.refreshToken || !authPayload.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unexpected auth response from backend",
        },
        { status: 502 },
      );
    }

    const bffResponse = NextResponse.json(
      {
        success: true,
        user: authPayload.user,
        redirectPath: getLoginRedirectPath(authPayload.accessToken),
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
        message: error instanceof Error ? error.message : "Unexpected login proxy error",
      },
      { status: 500 },
    );
  }
}