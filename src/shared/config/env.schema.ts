import { z } from 'zod';

function requiredHttpUrl(name: string) {
  return z.url({
    protocol: /^https?$/,
    error: `${name} é obrigatória e deve ser uma URL http(s) válida`,
  });
}

/** Variáveis disponíveis somente no servidor. */
export const serverEnvSchema = z.object({
  API_URL: requiredHttpUrl('API_URL'),
});

/** Variáveis expostas ao navegador (incorporadas ao bundle no build). */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: requiredHttpUrl('NEXT_PUBLIC_APP_URL'),
});

/** Todas as variáveis, conferidas de uma vez na inicialização do servidor. */
export const envSchema = serverEnvSchema.extend(publicEnvSchema.shape);

export function parseEnv<Schema extends z.ZodType>(
  schema: Schema,
  source: Record<string, string | undefined>,
): z.output<Schema> {
  const result = schema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente inválidas. Confira o .env.example.\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
