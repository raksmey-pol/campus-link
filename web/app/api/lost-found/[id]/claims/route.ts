import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return proxyBackendJson({
    request,
    method: "GET",
    path: `/items/${id}/claims`,
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();

  return proxyBackendJson({
    request,
    method: "POST",
    path: `/items/${id}/claims`,
    jsonBody: body,
  });
}
