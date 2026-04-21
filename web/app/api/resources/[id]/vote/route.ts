import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Vote Resource] POST params:', { id });

  const jsonBody = await request.json().catch(() => null);
  console.log('[BFF Vote Resource] Request body:', jsonBody);

  const path = `/resources/${id}/vote`;
  console.log('[BFF Vote Resource] Forwarding to backend:', path);

  return proxyBackendJson({
    request,
    method: "POST",
    path,
    jsonBody,
  });
}
