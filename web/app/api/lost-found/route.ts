import { NextRequest } from "next/server";
import { proxyBackendFormData, proxyBackendJson } from "@/lib/bff/backend";

export async function GET(request: NextRequest) {
  return proxyBackendJson({
    request,
    method: "GET",
    path: "/items",
    searchParams: request.nextUrl.searchParams,
  });
}

export async function POST(request: NextRequest) {
  return proxyBackendFormData({
    request,
    method: "POST",
    path: "/items",
  });
}
