import { createApi } from './create-api';

// No servidor, este módulo só é avaliado na renderização inicial, quando o
// useQuery ainda não dispara requisições, então a origem vazia não é usada.
// A URL precisa ser absoluta porque o `Request` do Node não aceita URL relativa.
const origin = typeof window === 'undefined' ? '' : window.location.origin;

/** Cliente de Client Components: passa pelo proxy BFF `/api/backend` (FE-07). */
export const api = createApi({ baseUrl: `${origin}/api/backend` });
