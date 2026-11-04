import type { components } from '@/shared/api/schema';

type Tokens = components['schemas']['TokensDto'];

export function makeTokens(overrides: Partial<Tokens> = {}): Tokens {
  return {
    accessToken: 'access-novo',
    refreshToken: 'refresh-novo',
    tokenType: 'Bearer',
    expiresIn: 900,
    ...overrides,
  };
}
