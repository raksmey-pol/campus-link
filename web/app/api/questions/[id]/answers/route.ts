import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Create Answer] POST params:', { id });

  const jsonBody = await request.json().catch(() => null);
  console.log('[BFF Create Answer] Request body:', jsonBody);

  const path = `/questions/${id}/answers`;
  console.log('[BFF Create Answer] Forwarding to backend:', path);

  return proxyBackendJson({
    request,
    method: "POST",
    path,
    jsonBody,
  });
}
