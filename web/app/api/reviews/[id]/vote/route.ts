import { NextRequest } from 'next/server';
import { proxyBackendJson } from '@/lib/bff/backend';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Vote Review] POST params:', { id });
  
  const jsonBody = await request.json().catch(() => null);
  console.log('[BFF Vote Review] Request body:', jsonBody);
  
  const path = `/reviews/${id}/vote`;
  console.log('[BFF Vote Review] Forwarding to backend:', path);
  
  return proxyBackendJson({
    request,
    method: "POST",
    path,
    jsonBody,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Unvote Review] DELETE params:', { id });
  
  const path = `/reviews/${id}/vote`;
  console.log('[BFF Unvote Review] Forwarding to backend:', path);
  
  return proxyBackendJson({
    request,
    method: "DELETE",
    path,
  });
}
