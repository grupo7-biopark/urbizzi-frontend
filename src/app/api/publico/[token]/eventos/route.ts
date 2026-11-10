import { z } from 'zod';
import { observarEventosPublicos } from '@/features/links-publicos/api/eventos-publicos.server';

// O mesmo formato dos links gerados: base64url sem preenchimento.
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!z.string().regex(TOKEN).safeParse(token).success) {
    return new Response(null, { status: 404 });
  }

  return observarEventosPublicos(token, request.signal);
}
