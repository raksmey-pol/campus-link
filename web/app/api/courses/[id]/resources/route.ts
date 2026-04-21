import { NextRequest } from "next/server";
import { proxyBackendJson, proxyBackendFormData } from "@/lib/bff/backend";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Resources] GET params:', { id });
  const path = `/courses/${id}/resources`;
  console.log('[BFF Resources] Forwarding to backend:', path);
  return proxyBackendJson({
    request,
    method: "GET",
    path,
    searchParams: request.nextUrl.searchParams,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Resources] POST params:', { id });
  
  // Check Content-Type to determine how to handle the body
  const contentType = request.headers.get('content-type') || '';
  const path = `/courses/${id}/resources`;
  
  if (contentType.includes('multipart/form-data')) {
    // Handle FormData (file upload)
    console.log('[BFF Resources] Received FormData for file upload');
    return proxyBackendFormData({
      request,
      method: "POST",
      path,
      searchParams: request.nextUrl.searchParams,
    });
  } else {
    // Handle JSON
    const jsonBody = await request.json().catch(() => null);
    console.log('[BFF Resources] Request body:', jsonBody);
    console.log('[BFF Resources] Forwarding to backend:', path);
    
    return proxyBackendJson({
      request,
      method: "POST",
      path,
      searchParams: request.nextUrl.searchParams,
      jsonBody,
    });
  }
}
