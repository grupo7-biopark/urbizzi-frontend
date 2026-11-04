import { describe, expect, it } from 'vitest';
import {
  hasNextPage,
  hasPreviousPage,
  isBeyondLastPage,
  type PaginationMeta,
} from './pagination';

function makeMeta(overrides: Partial<PaginationMeta> = {}): PaginationMeta {
  return { page: 2, pageSize: 20, total: 57, totalPages: 3, ...overrides };
}

describe('hasNextPage', () => {
  it('é verdadeiro antes da última página', () => {
    expect(hasNextPage(makeMeta())).toBe(true);
  });

  it('é falso na última página', () => {
    expect(hasNextPage(makeMeta({ page: 3 }))).toBe(false);
  });

  it('é falso sem resultados', () => {
    expect(hasNextPage(makeMeta({ page: 1, total: 0, totalPages: 0 }))).toBe(
      false,
    );
  });
});

describe('hasPreviousPage', () => {
  it('é verdadeiro depois da primeira página', () => {
    expect(hasPreviousPage(makeMeta())).toBe(true);
  });

  it('é falso na primeira página', () => {
    expect(hasPreviousPage(makeMeta({ page: 1 }))).toBe(false);
  });
});

describe('isBeyondLastPage', () => {
  it('é verdadeiro além da última página', () => {
    expect(isBeyondLastPage(makeMeta({ page: 4 }))).toBe(true);
  });

  it('é falso na última página', () => {
    expect(isBeyondLastPage(makeMeta({ page: 3 }))).toBe(false);
  });

  it('é falso na primeira página de uma lista vazia', () => {
    expect(
      isBeyondLastPage(makeMeta({ page: 1, total: 0, totalPages: 0 })),
    ).toBe(false);
  });
});
