import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '@/shared/ui/toast';
import { makeLote } from '@/test/factories/lote.factory';
import { makeUsuario } from '@/test/factories/usuario.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { AcaoStatusLote } from './acao-status-lote';

beforeEach(() => {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json(makeUsuario({ perfil: 'GESTOR' })),
    ),
  );
});

describe('AcaoStatusLote', () => {
  it.each([
    {
      acao: 'desbloquear' as const,
      label: 'Desbloquear lote',
      sucesso: 'Lote desbloqueado',
    },
    {
      acao: 'vender' as const,
      label: 'Marcar como Vendido',
      sucesso: 'Lote marcado como Vendido',
    },
  ])('$acao somente depois de confirmar', async ({ acao, label, sucesso }) => {
    let chamadas = 0;
    server.use(
      http.post('/v1/lotes/{id}/desbloquear', ({ response }) => {
        chamadas++;
        return response(200).json(makeLote());
      }),
      http.post('/v1/lotes/{id}/vender', ({ response }) => {
        chamadas++;
        return response(204).empty();
      }),
    );
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <ToastProvider>
          <AcaoStatusLote
            loteId={makeLote().id}
            numeroLote="12"
            acao={acao}
            invalidates={[]}
          />
        </ToastProvider>
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: label }));
    expect(chamadas).toBe(0);
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: label }),
    );
    expect(await screen.findByText(sucesso)).toBeInTheDocument();
    expect(chamadas).toBe(1);
  });
});
