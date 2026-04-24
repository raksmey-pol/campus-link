import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Question Detail] GET params:', { id });
  const path = `/questions/${id}`;
  console.log('[BFF Question Detail] Forwarding to backend:', path);
  return proxyBackendJson({
    request,
    method: "GET",
    path,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyBackendJson({
    request,
    method: "DELETE",
    path: `/questions/${id}`,
  });
}
