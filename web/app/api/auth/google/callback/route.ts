import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth/session";
import { getAuthResponse } from "@/lib/bff/auth";
import { getApiUrl } from "@/lib/config";
import { getLoginRedirectPath } from "@/lib/auth/token";
import {
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleOauthRedirectUri,
} from "@/lib/auth/google-oauth";

const GOOGLE_OAUTH_STATE_COOKIE = "cl_google_oauth_state";

function clearStateCookie(response: NextResponse) {
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function redirectToLoginWithError(origin: string, errorCode: string) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", errorCode);

  const response = NextResponse.redirect(loginUrl);
  clearStateCookie(response);

  return response;
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (error) {
    return redirectToLoginWithError(origin, "google_oauth_denied");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToLoginWithError(origin, "google_oauth_state_invalid");
  }

  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  if (!clientId || !clientSecret) {
    return redirectToLoginWithError(origin, "google_oauth_not_configured");
  }

  const redirectUri = getGoogleOauthRedirectUri(request);

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    const tokenPayload = (await tokenResponse.json().catch(() => null)) as
      | { id_token?: string }
      | null;

    const idToken = tokenPayload?.id_token;

    if (!tokenResponse.ok || !idToken) {
      return redirectToLoginWithError(origin, "google_token_exchange_failed");
    }

    const backendResponse = await fetch(`${getApiUrl()}/auth/google`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    });

    const backendRaw = await backendResponse.text();
    let backendPayload: unknown = null;

    if (backendRaw) {
      try {
        backendPayload = JSON.parse(backendRaw);
      } catch {
        backendPayload = { message: backendRaw };
      }
    }

    const authPayload = getAuthResponse(backendPayload);

    if (
      !backendResponse.ok ||
      !authPayload?.accessToken ||
      !authPayload?.refreshToken ||
      !authPayload.user
    ) {
      return redirectToLoginWithError(origin, "google_backend_login_failed");
    }

    const redirectPath = getLoginRedirectPath(authPayload.accessToken);
    const appRedirect = new URL(redirectPath, origin);
    const response = NextResponse.redirect(appRedirect);

    setSessionCookies(response, {
      accessToken: authPayload.accessToken,
      refreshToken: authPayload.refreshToken,
    });
    clearStateCookie(response);

    return response;
  } catch {
    return redirectToLoginWithError(origin, "google_oauth_callback_error");
  }
}
