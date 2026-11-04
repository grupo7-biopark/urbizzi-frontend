import type { components } from '@/shared/api/schema';

type ErrorResponse = components['schemas']['ErrorResponseDto'];

export function makeErrorResponse(
  overrides: Partial<ErrorResponse> = {},
): ErrorResponse {
  return {
    statusCode: 404,
    code: 'LOTE_NAO_ENCONTRADO',
    message: 'Lote não encontrado',
    path: '/v1/lotes/0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    timestamp: '2026-10-28T12:00:00.000Z',
    ...overrides,
  };
}
