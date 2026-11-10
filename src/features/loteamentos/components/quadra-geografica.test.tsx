import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, it, expect, vi } from 'vitest';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { makeQuadra } from '@/test/factories/quadra.factory';
import { ToastProvider } from '@/shared/ui/toast';
import type { components } from '@/shared/api/schema';
import { QuadrasPanel } from './quadras-panel';
vi.mock('next/navigation', () => import('@/test/next-navigation'));
vi.mock('@/shared/ui/mapa-geografico', () => ({
  MapaGeografico: () => <section aria-label="Mapa de teste" />,
}));
const parent = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const quadra = makeQuadra({ loteamentoId: parent, numero: 'A' });
const vertices = [
  [0, 0],
  [0, 1],
  [1, 0],
];
const area: components['schemas']['AreaGeograficaDto'] = {
  id: parent,
  loteamentoId: parent,
  quadraId: null,
  tipo: 'LOTEAMENTO',
  nome: 'Teste',
  status: null,
  vertices: [
    [0, 0],
    [0, 4],
    [4, 4],
    [4, 0],
  ],
};
const meta = { page: 1, pageSize: 100, total: 1, totalPages: 1 };
function renderPanel() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>
        <QuadrasPanel loteamentoId={parent} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id: parent,
        nome: 'Gestor',
        email: 'gestor@teste.example',
        perfil: 'GESTOR',
      }),
    ),
    http.get('/v1/loteamentos/{loteamentoId}/quadras', ({ response }) =>
      response(200).json({ data: [quadra], meta }),
    ),
    http.get('/v1/geografia/areas', ({ response }) =>
      response(200).json({
        data: [
          area,
          {
            ...area,
            id: quadra.id,
            quadraId: quadra.id,
            tipo: 'QUADRA',
            nome: 'Quadra A',
            vertices,
          },
        ],
        meta: { ...meta, total: 2 },
      }),
    ),
  );
});
it('envia número e contorno da nova quadra na mesma requisição e limpa o desenho', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post(
      '/v1/geografia/loteamentos/{loteamentoId}/quadras',
      async ({ request, response }) => {
        bodies.push(await request.json());
        return response(201).json(quadra);
      },
    ),
  );
  const u = userEvent.setup();
  renderPanel();
  await screen.findByRole('button', { name: 'Adicionar quadra' });
  await u.type(screen.getByLabelText(/^Número/), 'B');
  await u.click(
    screen.getByRole('button', { name: 'Demarcar quadra no mapa' }),
  );
  await u.click(
    await screen.findByText('Informar ou editar coordenadas dos vértices'),
  );
  await u.type(
    screen.getByLabelText('Vértices (latitude, longitude)'),
    '0,0\n0,1\n1,0',
  );
  await u.click(screen.getByRole('button', { name: 'Aplicar coordenadas' }));
  await u.click(screen.getByRole('button', { name: 'Adicionar quadra' }));
  await screen.findByText('Quadra cadastrada');
  expect(bodies).toEqual([{ cadastro: { numero: 'B' }, vertices }]);
  expect(
    screen.getByRole('button', { name: 'Demarcar quadra no mapa' }),
  ).toHaveAttribute('aria-expanded', 'false');
});
it('descarta o contorno alterado quando a edição é fechada sem salvar', async () => {
  const u = userEvent.setup();
  renderPanel();
  await u.click(
    await screen.findByRole('button', { name: 'Editar a quadra A' }),
  );
  const dialog = screen.getByRole('dialog');
  await u.click(
    within(dialog).getByRole('button', { name: 'Demarcar quadra no mapa' }),
  );
  await u.click(
    await within(dialog).findByText(
      'Informar ou editar coordenadas dos vértices',
    ),
  );
  await u.clear(
    within(dialog).getByLabelText('Vértices (latitude, longitude)'),
  );
  await u.type(
    within(dialog).getByLabelText('Vértices (latitude, longitude)'),
    '0,0\n0,2\n2,0',
  );
  await u.click(
    within(dialog).getByRole('button', { name: 'Aplicar coordenadas' }),
  );
  await u.click(within(dialog).getByRole('button', { name: /^Fechar$/ }));
  await u.click(screen.getByRole('button', { name: 'Editar a quadra A' }));
  const reopened = screen.getByRole('dialog');
  await u.click(
    within(reopened).getByRole('button', { name: 'Demarcar quadra no mapa' }),
  );
  await u.click(
    await within(reopened).findByText(
      'Informar ou editar coordenadas dos vértices',
    ),
  );
  expect(
    within(reopened).getByLabelText('Vértices (latitude, longitude)'),
  ).toHaveValue(
    '0.0000000, 0.0000000\n0.0000000, 1.0000000\n1.0000000, 0.0000000',
  );
});
