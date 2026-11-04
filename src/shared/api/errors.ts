import type { components } from './schema';

type ErrorResponse = components['schemas']['ErrorResponseDto'];
export type ErrorDetail = components['schemas']['ErrorDetailDto'];

/** Falha sem resposta da API. Não existe no backend, por isso o `statusCode` 0. */
export const NETWORK_ERROR_CODE = 'ERRO_DE_REDE';
export const NETWORK_ERROR_STATUS = 0;
/** Resposta de erro fora do formato da API (ex.: 502 em HTML de um intermediário). */
export const UNEXPECTED_ERROR_CODE = 'ERRO_INESPERADO';

const GENERIC_MESSAGE =
  'Não foi possível concluir a operação. Tente novamente em instantes.';
const NETWORK_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';

// Os códigos genéricos ficam aqui porque, neles, a `message` da API pode vir em
// inglês do próprio Nest ("Forbidden resource"). Os códigos de domínio fora do
// mapa já têm mensagem em português na API.
const FRIENDLY_MESSAGES = new Map<string, string>([
  ['DADOS_INVALIDOS', 'Os dados enviados são inválidos. Confira os campos.'],
  ['REQUISICAO_INVALIDA', 'Não foi possível processar os dados enviados.'],
  ['NAO_AUTENTICADO', 'Sua sessão expirou. Entre novamente para continuar.'],
  ['CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.'],
  ['ACESSO_NEGADO', 'Você não tem permissão para executar esta ação.'],
  ['RECURSO_NAO_ENCONTRADO', 'O registro procurado não foi encontrado.'],
  ['REGISTRO_DUPLICADO', 'Já existe um registro com esses dados.'],
  ['CONFLITO', 'Os dados mudaram. Atualize a página e tente novamente.'],
  ['LOTE_INDISPONIVEL', 'Este lote não está mais disponível.'],
  ['LOTE_NAO_DISPONIVEL', 'Este lote não está mais disponível.'],
  ['REGRA_DE_NEGOCIO_VIOLADA', 'Esta operação não é permitida pelas regras.'],
  ['ARQUIVO_MUITO_GRANDE', 'O arquivo excede o tamanho máximo permitido.'],
  ['MUITAS_REQUISICOES', 'Muitas tentativas. Aguarde e tente novamente.'],
  ['ERRO_INTERNO', GENERIC_MESSAGE],
  ['ERRO_HTTP', GENERIC_MESSAGE],
]);

type ApiErrorOptions = {
  statusCode: number;
  code: string;
  message: string;
  details?: readonly ErrorDetail[];
};

/** Único formato de erro que chega às telas. O `message` é sempre exibível. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly statusCode: number;
  readonly code: string;
  readonly details: readonly ErrorDetail[];

  constructor({ statusCode, code, message, details = [] }: ApiErrorOptions) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const { code, message, details } = body as Record<string, unknown>;

  return (
    typeof code === 'string' &&
    typeof message === 'string' &&
    (details === undefined || Array.isArray(details))
  );
}

export function apiErrorFromResponse(statusCode: number, body: unknown) {
  if (!isErrorResponse(body)) {
    return new ApiError({
      statusCode,
      code: UNEXPECTED_ERROR_CODE,
      message: GENERIC_MESSAGE,
    });
  }

  return new ApiError({
    statusCode,
    code: body.code,
    message: FRIENDLY_MESSAGES.get(body.code) ?? body.message,
    details: body.details,
  });
}

export function apiErrorFromNetworkFailure() {
  return new ApiError({
    statusCode: NETWORK_ERROR_STATUS,
    code: NETWORK_ERROR_CODE,
    message: NETWORK_MESSAGE,
  });
}

/** Texto seguro para a tela: nunca expõe mensagem de exceção do JavaScript. */
export function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : GENERIC_MESSAGE;
}
