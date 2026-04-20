import { NextRequest } from "next/server";

function normalizeUrl(input: string): string {
  return input.trim().replace(/\/+$/, "");
}

export function getGoogleClientId() {
  return (
    process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );
}

export function getGoogleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET;
}

export function getGoogleOauthRedirectUri(request: NextRequest): string {
  const configuredRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();

  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  return `${normalizeUrl(request.nextUrl.origin)}/api/auth/google/callback`;
}
