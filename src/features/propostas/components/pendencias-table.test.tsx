import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { components } from '@/shared/api/schema';
import { ToastProvider } from '@/shared/ui/toast';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeCliente } from '@/test/factories/cliente.factory';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeLote } from '@/test/factories/lote.factory';
import { makeProposta } from '@/test/factories/proposta.factory';
import { makeUsuario } from '@/test/factories/usuario.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import { ContadorPendencias } from './contador-pendencias';
import { PendenciasTable } from './pendencias-table';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const cliente = makeCliente();
const lote = makeLote({ status: 'RESERVADO' });
const reserva: components['schemas']['ReservaDto'] = {
  id: makeProposta().reservaId,
  loteId: lote.id,
  clienteId: cliente.id,
  vendedorId: makeProposta().vendedorId,
  status: 'ATIVA',
  dataInicio: '2026-11-01T12:00:00Z',
  dataVencimento: '2099-11-30T12:00:00Z',
  tempoRestanteSegundos: 1000,
};
let propostas: ReturnType<typeof makeProposta>[];

beforeEach(() => {
  setTestUrl('/propostas/pendencias');
  propostas = [
    makeProposta({ atrasada: true, prazoLimite: '2020-11-01T12:00:00Z' }),
    makeProposta({
      id: '11111111-1111-4111-8111-111111111111',
      condicoes: 'Parcelamento futuro',
    }),
  ];
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json(makeUsuario({ perfil: 'GESTOR' })),
    ),
    http.get('/v1/propostas/pendentes', ({ request, response }) => {
      const url = new URL(request.url);
      const pageSize = Number(url.searchParams.get('pageSize'));
      const pendentes = propostas.filter(
        (p) => p.status === 'EM_ANALISE' && !p.encerrada,
      );
      return response(200).json({
        data: pendentes.slice(0, pageSize),
        meta: {
          page: 1,
          pageSize,
          total: pendentes.length,
          totalPages: Math.ceil(pendentes.length / pageSize),
        },
      });
    }),
    http.get('/v1/propostas/{id}', ({ params, response }) =>
      response(200).json(propostas.find((p) => p.id === params.id)!),
    ),
    http.get('/v1/reservas/{id}', ({ response }) =>
      response(200).json(reserva),
    ),
    http.get('/v1/lotes/{id}', ({ response }) => response(200).json(lote)),
    http.get('/v1/clientes/{id}', ({ response }) =>
      response(200).json(cliente),
    ),
  );
});

function montar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ContadorPendencias />
        <PendenciasTable search={{ page: 1, pageSize: 20 }} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function abrir() {
  const user = userEvent.setup();
  await user.click(
    (await screen.findAllByRole('button', { name: 'Analisar proposta' }))[0],
  );
  const dialog = screen.getByRole('dialog');
  await within(dialog).findByRole('link', { name: cliente.nome });
  return { user, dialog };
}

it('mostra atrasadas primeiro, o detalhe do cliente e lote e o lembrete da aprovação', async () => {
  montar();
  expect(await screen.findByText('Em atraso')).toBeInTheDocument();
  const linhas = screen.getAllByRole('row');
  expect(linhas[1]).toHaveTextContent('Em atraso');
  expect(linhas[2]).toHaveTextContent('No prazo');
  expect(
    await screen.findByLabelText('2 propostas pendentes'),
  ).toHaveTextContent('2');
  const { dialog } = await abrir();
  expect(within(dialog).getByRole('link', { name: 'Lote 12' })).toHaveAttribute(
    'href',
    `/lotes/${lote.id}`,
  );
  expect(within(dialog).getByText('Reservado')).toBeInTheDocument();
  expect(
    within(dialog).getByText(/aprovação da proposta mantém o lote reservado/),
  ).toBeInTheDocument();
  await expectNoA11yViolations(document.body);
});

it.each(['aprovar', 'rejeitar'] as const)(
  'valida motivo e atualiza lista e contador ao %s',
  async (decisao) => {
    let recebido: unknown;
    const decidir = async (request: Request) => {
      recebido = await request.json();
      propostas[0].status = decisao === 'aprovar' ? 'APROVADA' : 'REJEITADA';
      return propostas[0];
    };
    // Os contratos de aprovação e rejeição têm a mesma resposta.
    server.use(
      http.post('/v1/propostas/{id}/aprovar', async ({ request, response }) =>
        response(200).json(await decidir(request)),
      ),
      http.post('/v1/propostas/{id}/rejeitar', async ({ request, response }) =>
        response(200).json(await decidir(request)),
      ),
    );
    montar();
    const { user, dialog } = await abrir();
    await user.selectOptions(within(dialog).getByLabelText(/Decisão/), decisao);
    await user.type(within(dialog).getByLabelText(/Motivo da decisão/), '   ');
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirmar decisão' }),
    );
    expect(
      await within(dialog).findByText('Informe o motivo da decisão.'),
    ).toBeInTheDocument();
    expect(recebido).toBeUndefined();
    await user.clear(within(dialog).getByLabelText(/Motivo da decisão/));
    await user.type(
      within(dialog).getByLabelText(/Motivo da decisão/),
      '  Motivo informado  ',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Confirmar decisão' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(recebido).toEqual({ motivo: 'Motivo informado' });
    expect(
      await screen.findByLabelText('1 proposta pendente'),
    ).toHaveTextContent('1');
    expect(screen.queryByText('Em atraso')).not.toBeInTheDocument();
  },
);

it('atualiza dados em conflito e impede uma segunda decisão', async () => {
  server.use(
    http.post('/v1/propostas/{id}/aprovar', ({ response }) => {
      propostas[0].status = 'APROVADA';
      return response(409).json(
        makeErrorResponse({
          code: 'PROPOSTA_JA_DECIDIDA',
          statusCode: 409,
          message: 'Proposta já decidida.',
        }),
      );
    }),
  );
  montar();
  const { user, dialog } = await abrir();
  await user.selectOptions(within(dialog).getByLabelText(/Decisão/), 'aprovar');
  await user.type(
    within(dialog).getByLabelText(/Motivo da decisão/),
    'Confirmar',
  );
  await user.click(
    within(dialog).getByRole('button', { name: 'Confirmar decisão' }),
  );
  expect(
    await within(dialog).findByText(/já foi decidida ou encerrada/),
  ).toBeInTheDocument();
  expect(
    within(dialog).queryByRole('button', { name: 'Confirmar decisão' }),
  ).not.toBeInTheDocument();
  expect(
    await screen.findByLabelText('1 proposta pendente'),
  ).toBeInTheDocument();
});

it('trata vazio, erro e nova tentativa', async () => {
  propostas = [];
  server.use(
    http.get('/v1/propostas/pendentes', ({ response }) =>
      response(403).json(
        makeErrorResponse({ code: 'ACESSO_NEGADO', statusCode: 403 }),
      ),
    ),
  );
  montar();
  expect(
    await screen.findByText('Você não tem permissão para executar esta ação.'),
  ).toBeInTheDocument();
  server.resetHandlers();
  server.use(
    http.get('/v1/propostas/pendentes', ({ response }) =>
      response(200).json({
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      }),
    ),
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Tentar novamente' }),
  );
  expect(
    await screen.findByText('Nenhuma proposta pendente'),
  ).toBeInTheDocument();
});

it('comercial não consulta nem recebe contador de pendências', async () => {
  const chamada = vi.fn<() => void>();
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json(makeUsuario({ perfil: 'COMERCIAL' })),
    ),
    http.get('/v1/propostas/pendentes', ({ response }) => {
      chamada();
      return response(403).json(
        makeErrorResponse({ code: 'ACESSO_NEGADO', statusCode: 403 }),
      );
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ContadorPendencias />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(client.getQueryData(['auth', 'me'])).toBeDefined(),
  );
  expect(chamada).not.toHaveBeenCalled();
  expect(
    screen.queryByLabelText(/propostas pendentes/),
  ).not.toBeInTheDocument();
});

it('informa cadastros removidos ao consultar o detalhe histórico', async () => {
  server.use(
    http.get('/v1/lotes/{id}', ({ response }) =>
      response(404).json(makeErrorResponse()),
    ),
    http.get('/v1/clientes/{id}', ({ response }) =>
      response(404).json(makeErrorResponse()),
    ),
  );
  montar();
  await userEvent.click(
    (await screen.findAllByRole('button', { name: 'Analisar proposta' }))[0],
  );
  expect(await screen.findByText('Lote removido')).toBeInTheDocument();
  expect(screen.getByText('Cliente removido')).toBeInTheDocument();
});

it('permite tentar novamente quando a consulta de detalhe falha', async () => {
  server.use(
    http.get('/v1/reservas/{id}', ({ response }) =>
      response(403).json(
        makeErrorResponse({ statusCode: 403, code: 'ACESSO_NEGADO' }),
      ),
    ),
  );
  montar();
  await userEvent.click(
    (await screen.findAllByRole('button', { name: 'Analisar proposta' }))[0],
  );
  const dialog = screen.getByRole('dialog');
  expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
  expect(
    within(dialog).queryByRole('button', { name: 'Confirmar decisão' }),
  ).not.toBeInTheDocument();
  server.use(
    http.get('/v1/reservas/{id}', ({ response }) =>
      response(200).json(reserva),
    ),
  );
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Tentar novamente' }),
  );
  expect(
    await within(dialog).findByRole('link', { name: cliente.nome }),
  ).toBeInTheDocument();
});
