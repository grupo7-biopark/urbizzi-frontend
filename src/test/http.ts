import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/shared/api/schema';

/**
 * Handlers do MSW tipados pelo contrato: rota, parâmetros e corpo da resposta
 * vêm do schema gerado, então o teste quebra quando o contrato muda.
 * O `*` evita depender da origem (proxy no navegador, `API_URL` no servidor).
 */
export const http = createOpenApiHttp<paths>({ baseUrl: '*' });
