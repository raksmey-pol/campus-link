import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function GET(request: NextRequest) {
  return proxyBackendJson({
    request,
    method: "GET",
    path: "/swaps",
    searchParams: request.nextUrl.searchParams,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyBackendJson({
    request,
    method: "POST",
    path: "/swaps",
    jsonBody: body,
  });
}