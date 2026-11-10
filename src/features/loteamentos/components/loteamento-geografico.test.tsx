import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, it, expect } from 'vitest';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import { setTestUrl } from '@/test/next-navigation';
import { ToastProvider } from '@/shared/ui/toast';
import { NovoLoteamentoForm } from './loteamento-form';
vi.mock('next/navigation', () => import('@/test/next-navigation'));
vi.mock('@/shared/ui/mapa-geografico', () => ({
  MapaGeografico: () => <section aria-label="Mapa de teste" />,
}));
it('envia cadastro e coordenadas juntos somente quando a área foi alterada', async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post('/v1/geografia/loteamentos', async ({ request, response }) => {
      bodies.push(await request.json());
      return response(201).json(makeLoteamento());
    }),
  );
  setTestUrl('/loteamentos/novo');
  const u = userEvent.setup();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>
        <NovoLoteamentoForm />
      </ToastProvider>
    </QueryClientProvider>,
  );
  await u.type(screen.getByLabelText(/Nome/), 'Terreno geográfico');
  await u.click(screen.getByRole('button', { name: 'Demarcar no mapa' }));
  await u.click(
    screen.getByText('Informar ou editar coordenadas dos vértices'),
  );
  await u.type(
    screen.getByLabelText('Vértices (latitude, longitude)'),
    '0,0\n0,1\n1,0',
  );
  await u.click(screen.getByRole('button', { name: 'Aplicar coordenadas' }));
  await u.click(screen.getByRole('button', { name: 'Salvar' }));
  await screen.findByText('Loteamento cadastrado');
  expect(bodies).toEqual([
    {
      cadastro: {
        nome: 'Terreno geográfico',
        descricao: null,
        localizacao: null,
      },
      vertices: [
        [0, 0],
        [0, 1],
        [1, 0],
      ],
    },
  ]);
});
