import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { matchId } = await params;
  return proxyBackendJson({ request, method: "PATCH", path: `/swaps/matches/${matchId}/decline` });
}