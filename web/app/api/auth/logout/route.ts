import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies, getSessionCookieNames } from "@/lib/auth/session";
import { getApiUrl } from "@/lib/config";

export async function POST(request: NextRequest) {
  const cookieNames = getSessionCookieNames();
  const refreshToken = request.cookies.get(cookieNames.refresh)?.value;

  try {
    if (refreshToken) {
      await fetch(`${getApiUrl()}/auth/logout`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
    }
  } catch {
    // Intentionally ignore backend failures and still clear local cookies.
  }

  const response = NextResponse.json({ success: true, loggedOut: true }, { status: 200 });
  clearSessionCookies(response);
  return response;
}