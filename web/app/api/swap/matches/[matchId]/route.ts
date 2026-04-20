import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { matchId } = await params;
  return proxyBackendJson({ request, method: "GET", path: `/swaps/matches/${matchId}` });
}