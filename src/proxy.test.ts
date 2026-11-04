// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';
import {
  ACCESS_COOKIE,
  CURRENT_PATH_HEADER,
  REFRESH_COOKIE,
} from './shared/auth/session-paths';

const FRONT = 'http://front.test';

function request(path: string, cookie?: string) {
  return new NextRequest(`${FRONT}${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

function location(response: Response) {
  return response.headers.get('location');
}

describe('sem sessão', () => {
  it('leva ao login preservando a página de destino', () => {
    const response = proxy(request('/lotes?status=A,B&page=2'));

    expect(location(response)).toBe(
      `${FRONT}/login?redirect=%2Flotes%3Fstatus%3DA%2CB%26page%3D2`,
    );
  });

  it('não acrescenta destino ao sair da página inicial', () => {
    expect(location(proxy(request('/')))).toBe(`${FRONT}/login`);
  });

  it('deixa abrir o login', () => {
    expect(location(proxy(request('/login')))).toBeNull();
  });

  it.each([
    '/recuperar-senha',
    '/redefinir-senha',
    '/sessao-indisponivel',
    '/design-system',
  ])('deixa abrir %s', (path) => {
    expect(location(proxy(request(path)))).toBeNull();
  });
});

describe('com sessão', () => {
  it.each([
    ['access token', `${ACCESS_COOKIE}=a`],
    ['refresh token', `${REFRESH_COOKIE}=b`],
  ])('deixa abrir a rota protegida só com %s', (_nome, cookie) => {
    expect(location(proxy(request('/lotes', cookie)))).toBeNull();
  });

  it('tira do login e vai à página de destino', () => {
    const response = proxy(
      request('/login?redirect=%2Flotes', `${REFRESH_COOKIE}=b`),
    );

    expect(location(response)).toBe(`${FRONT}/lotes`);
  });

  it('tira do login sem seguir um destino externo', () => {
    const response = proxy(
      request('/login?redirect=//site.test', `${REFRESH_COOKIE}=b`),
    );

    expect(location(response)).toBe(`${FRONT}/`);
  });

  it('informa ao layout a página atual, ignorando o valor enviado pelo navegador', () => {
    const response = proxy(
      new NextRequest(`${FRONT}/lotes?page=2`, {
        headers: {
          cookie: `${REFRESH_COOKIE}=b`,
          [CURRENT_PATH_HEADER]: '//site.test',
        },
      }),
    );

    expect(
      response.headers.get(`x-middleware-request-${CURRENT_PATH_HEADER}`),
    ).toBe('/lotes?page=2');
  });
});
