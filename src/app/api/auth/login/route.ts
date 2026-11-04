import { NextResponse, type NextRequest } from 'next/server';
import { getServerApi } from '@/shared/api/client.server';
import {
  apiUnavailable,
  bffError,
  forwardApiError,
  invalidOrigin,
  isAllowedOrigin,
} from '@/shared/auth/bff-response.server';
import { writeSessionCookies } from '@/shared/auth/session.server';

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return invalidOrigin(request);
  }

  const body: unknown = await request.json().catch(() => null);

  if (typeof body !== 'object' || body === null) {
    return bffError(request, 400, 'REQUISICAO_INVALIDA', 'Requisição inválida');
  }

  try {
    const { data, error, response } = await getServerApi().POST(
      '/v1/auth/login',
      // A validação é da API, e o erro dela volta para a tela.
      { body: body as { email: string; senha: string } },
    );

    if (!data) {
      return forwardApiError(request, response.status, error);
    }

    // Os tokens ficam só nos cookies: o corpo nunca os devolve ao navegador.
    const result = new NextResponse(null, { status: 204 });
    writeSessionCookies(result, data);

    return result;
  } catch {
    return apiUnavailable(request);
  }
}
