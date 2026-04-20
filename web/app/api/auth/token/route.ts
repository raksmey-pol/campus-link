import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieNames } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const cookieNames = getSessionCookieNames();
  const accessToken = request.cookies.get(cookieNames.access)?.value;

  if (!accessToken) {
    return NextResponse.json({ success: false, token: null }, { status: 401 });
  }

  return NextResponse.json({ success: true, token: accessToken });
}