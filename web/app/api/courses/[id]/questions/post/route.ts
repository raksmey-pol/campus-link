import { NextRequest } from 'next/server';
import { proxyBackendJson } from '@/lib/bff/backend';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[BFF Create Question] POST params:', { id });
  
  const jsonBody = await request.json().catch(() => null);
  console.log('[BFF Create Question] Request body:', jsonBody);
  
  const path = `/courses/${id}/questions`;
  console.log('[BFF Create Question] Forwarding to backend:', path);
  
  return proxyBackendJson({
    request,
    method: "POST",
    path,
    jsonBody,
  });
}
