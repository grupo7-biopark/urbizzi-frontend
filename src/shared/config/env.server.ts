import 'server-only';
import { parseEnv, serverEnvSchema } from './env.schema';

/**
 * Lê no momento da chamada, e não ao importar o módulo: o `next build` carrega
 * as rotas sem ter as variáveis de execução, que só existem ao subir o servidor.
 */
export function getServerEnv() {
  return parseEnv(serverEnvSchema, { API_URL: process.env.API_URL });
}
