import { z } from 'zod';
import { respostaConexaoEncerrada } from '@/shared/api/eventos-sse.server';
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
    return respostaConexaoEncerrada('FLUXO_INDISPONIVEL');
  }

  return observarEventosPublicos(token, request.signal);
}
