function serializeValue(value: unknown): string | undefined {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return encodeURIComponent(value);
  }

  if (typeof value === 'string') {
    return value === '' ? undefined : encodeURIComponent(value);
  }

  if (Array.isArray(value)) {
    const items = value
      .map(serializeValue)
      .filter((item) => item !== undefined);
    return items.length > 0 ? items.join(',') : undefined;
  }

  return undefined;
}

/**
 * Monta a query string no padrão da API, sem o `?` inicial: vários valores
 * separados por vírgula (`status=DISPONIVEL,RESERVADO`) e sem filtros vazios.
 * Também é o `querySerializer` dos clientes, para as chamadas seguirem o padrão
 * documentado pela API, e não o do `openapi-fetch` (`status=A&status=B`).
 */
export function toQueryString(query: Record<string, unknown>) {
  return Object.entries(query)
    .map(([name, value]) => [name, serializeValue(value)] as const)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${encodeURIComponent(name)}=${value}`)
    .join('&');
}
