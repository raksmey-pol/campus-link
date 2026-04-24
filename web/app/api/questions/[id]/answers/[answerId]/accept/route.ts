import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  const { id, answerId } = await params;
  const jsonBody = await request.json().catch(() => null);

  return proxyBackendJson({
    request,
    method: "PATCH",
    path: `/questions/${id}/answers/${answerId}/accept`,
    jsonBody,
  });
}
