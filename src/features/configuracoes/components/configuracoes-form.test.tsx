import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui/toast';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import { ConfiguracoesForm } from './configuracoes-form';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const META = { page: 1, pageSize: 100, total: 2, totalPages: 1 };

function renderTela() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfiguracoesForm />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function mockPrazos(
  data = [
    { chave: 'prazo_reserva_dias', valor: 10 },
    { chave: 'prazo_analise_dias_uteis', valor: 3 },
  ],
) {
  server.use(
    http.get('/v1/configuracoes', ({ response }) =>
      response(200).json({ data, meta: { ...META, total: data.length } }),
    ),
  );
}

function erro(statusCode: number, code: string, message: string) {
  return HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
    status: statusCode,
  });
}

beforeEach(() => {
  setTestUrl('/configuracoes');
});

describe('ConfiguracoesForm', () => {
  it('mostra os prazos salvos, o aviso e a explicação de cada campo, sem violações', async () => {
    mockPrazos();

    const { container } = renderTela();

    expect(
      screen.getByLabelText('Carregando as configurações'),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText(/Prazo da reserva/)).toHaveValue('10');
    expect(screen.getByLabelText(/Prazo de análise/)).toHaveValue('3');
    expect(
      screen.getByText(/próximas reservas e propostas/),
    ).toBeInTheDocument();
    expect(screen.getByText(/dias corridos/)).toBeInTheDocument();
    expect(screen.getByText(/dias úteis o gestor/)).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('sem valor gravado, mostra o padrão da API', async () => {
    mockPrazos([]);

    renderTela();

    expect(await screen.findByLabelText(/Prazo da reserva/)).toHaveValue('7');
    expect(screen.getByLabelText(/Prazo de análise/)).toHaveValue('7');
  });

  it('salva os dois prazos como números e avisa', async () => {
    mockPrazos();
    const corpos: unknown[] = [];
    server.use(
      mswHttp.patch('*/v1/configuracoes', async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json({
          prazoReservaDias: 15,
          prazoAnaliseDiasUteis: 3,
        });
      }),
    );
    const user = userEvent.setup();
    renderTela();

    const reserva = await screen.findByLabelText(/Prazo da reserva/);
    await user.clear(reserva);
    await user.type(reserva, '15');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Configurações salvas')).toBeInTheDocument();
    expect(corpos).toEqual([
      { prazoReservaDias: 15, prazoAnaliseDiasUteis: 3 },
    ]);
  });

  it('recusa valores inválidos antes de enviar', async () => {
    mockPrazos();
    const corpos: unknown[] = [];
    server.use(
      mswHttp.patch('*/v1/configuracoes', () => {
        corpos.push(true);
        return HttpResponse.json({});
      }),
    );
    const user = userEvent.setup();
    renderTela();

    const reserva = await screen.findByLabelText(/Prazo da reserva/);
    await user.clear(reserva);
    await user.type(reserva, '0');
    const analise = screen.getByLabelText(/Prazo de análise/);
    await user.clear(analise);
    await user.type(analise, '2,5');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Use pelo menos 1 dia')).toBeInTheDocument();
    expect(
      screen.getByText('Use um número inteiro de dias'),
    ).toBeInTheDocument();
    expect(corpos).toEqual([]);
  });

  it('mostra o erro da API no formulário', async () => {
    mockPrazos();
    server.use(
      mswHttp.patch('*/v1/configuracoes', () =>
        erro(500, 'ERRO_INTERNO', 'Internal server error'),
      ),
    );
    const user = userEvent.setup();
    renderTela();

    await screen.findByLabelText(/Prazo da reserva/);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível concluir a operação',
      ),
    );
  });

  it('em uma falha ao carregar, permite tentar de novo', async () => {
    server.use(
      mswHttp.get('*/v1/configuracoes', () =>
        erro(500, 'ERRO_INTERNO', 'Internal server error'),
      ),
    );
    const user = userEvent.setup();
    renderTela();

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    mockPrazos();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByLabelText(/Prazo da reserva/)).toHaveValue('10');
  });
});
