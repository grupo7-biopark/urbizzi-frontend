import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeCliente } from '@/test/factories/cliente.factory';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeLote } from '@/test/factories/lote.factory';
import { http } from '@/test/http';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import type { HistoricoClienteItem } from '../api/clientes.api';
import { ClienteDetalhe } from './cliente-detalhe';

const cliente = makeCliente({ telefone: '45999998888' });
const lote = makeLote();
const reserva: HistoricoClienteItem['reserva'] = {
  id: '65d177e0-9b1f-4ce8-8f4a-e3d514737972',
  status: 'EXPIRADA',
  dataInicio: '2026-11-01T12:00:00.000Z',
  dataVencimento: '2026-11-08T12:00:00.000Z',
  lote: {
    id: lote.id,
    numero: lote.numero,
    quadra: 'Q1',
    loteamentoId: lote.loteamentoId,
    loteamento: 'Bela Vista',
  },
};
const proposta: NonNullable<HistoricoClienteItem['proposta']> = {
  id: 'd4043ade-1f74-4a1e-8b97-edb957ed48bc',
  status: 'REJEITADA',
  valor: '250000.50',
  dataEnvio: '2026-11-03T12:00:00.000Z',
  prazoLimite: '2026-11-07T12:00:00.000Z',
  decisao: {
    decididoPorId: '2d714ca8-6b95-4dcc-a630-65c5df023d6d',
    data: '2026-11-04T15:00:00.000Z',
    motivo: 'Condições fora da política comercial.',
  },
};

function mockCliente() {
  server.use(
    http.get('/v1/clientes/{id}', ({ response }) =>
      response(200).json(cliente),
    ),
  );
}

function mockHistorico(data: HistoricoClienteItem[]) {
  server.use(
    http.get('/v1/clientes/{id}/historico', ({ request, response }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get('page')).toBe('1');
      expect(params.get('pageSize')).toBe('20');
      return response(200).json({
        data,
        meta: {
          page: 1,
          pageSize: 20,
          total: data.length,
          totalPages: Math.ceil(data.length / 20),
        },
      });
    }),
  );
}

function renderDetalhe() {
  mockCliente();
  return renderWithQuery(
    <ClienteDetalhe
      id={cliente.id}
      search={{ page: 1, pageSize: 20 }}
      podeEditar
    />,
  );
}

describe('Detalhe do cliente', () => {
  it('mostra os dados com máscaras e o estado sem histórico', async () => {
    mockHistorico([]);
    const { container } = renderDetalhe();
    expect(screen.getByLabelText('Carregando cliente')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: cliente.nome }),
    ).toBeVisible();
    expect(screen.getByText('529.982.247-25')).toBeVisible();
    expect(screen.getByText('(45) 99999-8888')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Editar cliente' }),
    ).toHaveAttribute('href', `/clientes/${cliente.id}/editar`);
    expect(
      await screen.findByText('Nenhuma reserva ou proposta no histórico'),
    ).toBeVisible();
    await expectNoA11yViolations(container);
  });

  it('mantém a ordem da API e mostra valor, decisão, datas e links dos lotes', async () => {
    mockHistorico([
      {
        id: proposta.id,
        tipo: 'PROPOSTA',
        data: proposta.dataEnvio,
        reserva,
        proposta,
      },
      {
        id: reserva.id,
        tipo: 'RESERVA',
        data: reserva.dataInicio,
        reserva,
        proposta: null,
      },
    ]);
    const { container } = renderDetalhe();
    const timeline = await screen.findByRole('list', {
      name: 'Linha do tempo',
    });
    const [envio, inicio] = within(timeline).getAllByRole('listitem');
    expect(within(envio).getByText('Proposta enviada')).toBeVisible();
    expect(within(envio).getByText('Rejeitada')).toBeVisible();
    expect(within(envio).getByText('R$ 250.000,50')).toBeVisible();
    expect(
      within(envio).getByText('Condições fora da política comercial.'),
    ).toBeVisible();
    expect(envio.querySelector('time')).toHaveAttribute(
      'datetime',
      proposta.dataEnvio,
    );
    expect(
      envio.querySelector('time[datetime="2026-11-04T15:00:00.000Z"]'),
    ).toBeVisible();
    expect(within(inicio).getByText('Reserva iniciada')).toBeVisible();
    expect(within(inicio).getByText('Expirada')).toBeVisible();
    expect(
      inicio.querySelector('time[datetime="2026-11-08T12:00:00.000Z"]'),
    ).toBeVisible();
    for (const link of within(timeline).getAllByRole('link', {
      name: `Lote ${lote.numero}`,
    })) {
      expect(link).toHaveAttribute('href', `/lotes/${lote.id}`);
    }
    await expectNoA11yViolations(container);
  });

  it('preserva os dados do cliente quando o histórico falha e permite tentar de novo', async () => {
    server.use(
      http.get('/v1/clientes/{id}/historico', ({ response }) =>
        response(403).json(
          makeErrorResponse({ statusCode: 403, code: 'ACESSO_NEGADO' }),
        ),
      ),
    );
    renderDetalhe();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Você não tem permissão');
    expect(screen.getByRole('heading', { name: cliente.nome })).toBeVisible();
    mockHistorico([]);
    await userEvent
      .setup()
      .click(within(alerta).getByRole('button', { name: 'Tentar novamente' }));
    expect(
      await screen.findByText('Nenhuma reserva ou proposta no histórico'),
    ).toBeVisible();
  });
});
