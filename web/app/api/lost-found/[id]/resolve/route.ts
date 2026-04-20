import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyBackendJson({ request, method: "PATCH", path: `/items/${id}/resolve` });
}
