import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Reviews] GET params:', { id });
  const path = `/courses/${id}/reviews`;
  console.log('[BFF Reviews] Forwarding to backend:', path);
  return proxyBackendJson({
    request,
    method: "GET",
    path,
    searchParams: request.nextUrl.searchParams,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jsonBody = await request.json().catch(() => null);
  return proxyBackendJson({
    request,
    method: "POST",
    path: `/courses/${id}/reviews`,
    jsonBody,
  });
}
