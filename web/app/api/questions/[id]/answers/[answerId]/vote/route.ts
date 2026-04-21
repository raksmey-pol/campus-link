import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  const { id, answerId } = await params;
  console.log('[BFF Vote Answer] POST params:', { questionId: id, answerId });

  const jsonBody = await request.json().catch(() => null);
  console.log('[BFF Vote Answer] Request body:', jsonBody);

  const path = `/questions/${id}/answers/${answerId}/vote`;
  console.log('[BFF Vote Answer] Forwarding to backend:', path);

  return proxyBackendJson({
    request,
    method: "POST",
    path,
    jsonBody,
  });
}
