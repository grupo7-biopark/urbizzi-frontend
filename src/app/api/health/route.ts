import { getServerEnv } from '@/shared/config/env.server';

const API_TIMEOUT_MS = 2000;

/** Qualquer resposta HTTP conta: um 503 da API ainda prova que ela foi alcançada. */
async function isApiReachable(apiUrl: string) {
  try {
    await fetch(new URL('/health', apiUrl), {
      cache: 'no-store',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const { API_URL } = getServerEnv();

  return Response.json({
    status: 'ok',
    apiReachable: await isApiReachable(API_URL),
  });
}
