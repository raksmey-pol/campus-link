import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieNames } from "@/lib/auth/session";
import { getApiUrl } from "@/lib/config";
import { extractErrorMessage } from "@/lib/bff/auth";

export async function GET(request: NextRequest) {
  try {
    const cookieNames = getSessionCookieNames();
    const accessToken = request.cookies.get(cookieNames.access)?.value;

    if (!accessToken) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const response = await fetch(`${getApiUrl()}/auth/me`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
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
          message: extractErrorMessage(payload, "Unable to load profile"),
        },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, user: payload }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unexpected profile proxy error",
      },
      { status: 500 },
    );
  }
}