import { NextRequest } from "next/server";
import { proxyBackendJson } from "@/lib/bff/backend";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyBackendJson({
    request,
    method: "GET",
    path: `/admin/course-community/questions/${id}`,
  });
}
