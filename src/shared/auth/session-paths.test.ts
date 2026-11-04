import { describe, expect, it } from 'vitest';
import {
  getLoginPath,
  getRefreshPath,
  getSafeRedirect,
  getSessionUnavailablePath,
} from './session-paths';

describe('getSafeRedirect', () => {
  it.each(['/', '/lotes', '/lotes?status=DISPONIVEL&page=2', '/lotes#mapa'])(
    'aceita o caminho interno %s',
    (value) => {
      expect(getSafeRedirect(value)).toBe(value);
    },
  );

  it.each([
    ['site externo', 'https://site.com'],
    ['protocolo relativo', '//site.com'],
    ['barra invertida', '/\\site.com'],
    ['tabulação', '/\t/site.com'],
    ['quebra de linha', '/\n/site.com'],
    ['sem barra inicial', 'lotes'],
    ['endereço inválido', '//['],
    ['o próprio login', '/login'],
    ['o próprio login com query', '/login?redirect=/'],
    ['vazio', ''],
    ['nulo', null],
    ['indefinido', undefined],
    ['repetido na URL', ['/a', '/b']],
  ])('recusa %s', (_nome, value) => {
    expect(getSafeRedirect(value)).toBe('/');
  });
});

describe('caminhos com destino', () => {
  it('codifica o destino', () => {
    const target = '/lotes?status=A,B&page=2';
    const encoded = '%2Flotes%3Fstatus%3DA%2CB%26page%3D2';

    expect(getLoginPath(target)).toBe(`/login?redirect=${encoded}`);
    expect(getRefreshPath(target)).toBe(
      `/api/auth/refresh?redirect=${encoded}`,
    );
    expect(getSessionUnavailablePath(target)).toBe(
      `/sessao-indisponivel?redirect=${encoded}`,
    );
  });

  it('omite o destino padrão', () => {
    expect(getLoginPath('/')).toBe('/login');
    expect(getRefreshPath('/')).toBe('/api/auth/refresh');
  });
});
