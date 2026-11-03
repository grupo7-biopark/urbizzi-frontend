// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  envSchema,
  parseEnv,
  publicEnvSchema,
  serverEnvSchema,
} from './env.schema';

const validEnv = {
  API_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3001',
};

describe('parseEnv', () => {
  it('retorna as variáveis quando são válidas', () => {
    expect(parseEnv(envSchema, validEnv)).toEqual(validEnv);
  });

  it('gera erro nomeando a variável de servidor ausente', () => {
    expect(() => parseEnv(serverEnvSchema, {})).toThrow(
      /API_URL é obrigatória/,
    );
  });

  it('gera erro nomeando a variável pública ausente', () => {
    expect(() => parseEnv(publicEnvSchema, {})).toThrow(
      /NEXT_PUBLIC_APP_URL é obrigatória/,
    );
  });

  it('informa todas as variáveis ausentes de uma vez', () => {
    expect(() => parseEnv(envSchema, {})).toThrow(
      /API_URL[\s\S]*NEXT_PUBLIC_APP_URL/,
    );
  });

  it.each(['', 'nao-e-url', 'ftp://localhost:3000'])(
    'rejeita o valor inválido "%s"',
    (value) => {
      expect(() => parseEnv(serverEnvSchema, { API_URL: value })).toThrow(
        /API_URL/,
      );
    },
  );

  it('não expõe variáveis de servidor no schema público', () => {
    expect(
      parseEnv(publicEnvSchema, {
        ...validEnv,
      }),
    ).toEqual({ NEXT_PUBLIC_APP_URL: validEnv.NEXT_PUBLIC_APP_URL });
  });
});
