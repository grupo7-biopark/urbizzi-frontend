import { expect, it } from 'vitest';
import { propostasSearchSchema } from './propostas-search.schema';

it('limita a paginação e não aceita vendedor pela URL', () => {
  expect(
    propostasSearchSchema.parse({
      page: '-1',
      pageSize: '999',
      vendedorId: 'outro',
    }),
  ).toEqual({ page: 1, pageSize: 20 });
  expect(propostasSearchSchema.parse({ page: '2', pageSize: '10' })).toEqual({
    page: 2,
    pageSize: 10,
  });
});
