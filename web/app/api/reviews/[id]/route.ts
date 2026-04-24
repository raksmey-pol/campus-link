import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyBackendJson({
    request,
    method: "DELETE",
    path: `/reviews/${id}`,
  });
}
