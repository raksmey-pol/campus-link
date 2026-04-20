import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleClientId,
  getGoogleOauthRedirectUri,
} from "@/lib/auth/google-oauth";

const GOOGLE_OAUTH_STATE_COOKIE = "cl_google_oauth_state";

function setStateCookie(response: NextResponse, value: string) {
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function GET(request: NextRequest) {
  const clientId = getGoogleClientId();

  if (!clientId) {
    return NextResponse.json(
      {
        success: false,
        message: "Google OAuth is not configured: GOOGLE_CLIENT_ID is missing",
      },
      { status: 500 },
    );
  }

  const state = randomUUID();
  const redirectUri = getGoogleOauthRedirectUri(request);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const response = NextResponse.redirect(googleAuthUrl);
  setStateCookie(response, state);

  return response;
}
