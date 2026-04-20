import { NextRequest } from "next/server";
import { proxyBackendFile } from "@/lib/bff/backend";

export async function GET(request: NextRequest) {
  return proxyBackendFile({
    request,
    method: "GET",
    path: "/items/export/csv",
    searchParams: request.nextUrl.searchParams,
  });
}
