import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

type RouteContext = {
  params: Promise<{ id: string; claimId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, claimId } = await params;
  const body = await request.json();
  return proxyBackendJson({
    request,
    method: "PATCH",
    path: `/items/${id}/claims/${claimId}/status`,
    jsonBody: body,
  });
}
