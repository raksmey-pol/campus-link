import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyBackendJson({ request, method: "GET", path: `/swaps/${id}` });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyBackendJson({ request, method: "DELETE", path: `/swaps/${id}` });
}