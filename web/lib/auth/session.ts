import { NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE_NAME = "cl_access_token";
const REFRESH_TOKEN_COOKIE_NAME = "cl_refresh_token";
const ACCESS_TOKEN_MAX_AGE_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7);
const REFRESH_TOKEN_MAX_AGE_SECONDS = Number(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 30);

function toPositiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function cookieSecurityConfig() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setSessionCookies(response: NextResponse, tokens: { accessToken: string; refreshToken: string }) {
  const cookieConfig = cookieSecurityConfig();

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: tokens.accessToken,
    ...cookieConfig,
    maxAge: toPositiveNumber(ACCESS_TOKEN_MAX_AGE_SECONDS, 60 * 60 * 24 * 7),
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: tokens.refreshToken,
    ...cookieConfig,
    maxAge: toPositiveNumber(REFRESH_TOKEN_MAX_AGE_SECONDS, 60 * 60 * 24 * 30),
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: "",
    ...cookieSecurityConfig(),
    maxAge: 0,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: "",
    ...cookieSecurityConfig(),
    maxAge: 0,
  });
}

export function getSessionCookieNames() {
  return {
    access: ACCESS_TOKEN_COOKIE_NAME,
    refresh: REFRESH_TOKEN_COOKIE_NAME,
  };
}
