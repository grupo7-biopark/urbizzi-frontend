import type { NextRequest } from 'next/server';
import { proxyToBackend } from '@/shared/auth/backend-proxy.server';

async function handler(
  request: NextRequest,
  context: RouteContext<'/api/backend/[...path]'>,
) {
  const { path } = await context.params;

  return proxyToBackend(request, path);
}

export {
  handler as DELETE,
  handler as GET,
  handler as HEAD,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
