import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function GET(request: NextRequest) {
  return proxyBackendJson({
    request,
    method: "GET",
    path: "/users/me/points",
    searchParams: request.nextUrl.searchParams,
  });
}
