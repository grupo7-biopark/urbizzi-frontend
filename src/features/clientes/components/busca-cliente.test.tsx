import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http as mswHttp } from 'msw';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import type { ClienteResumo } from '../api/clientes.api';
import { BuscaCliente } from './busca-cliente';

const MARIA = {
  id: '2872822b-14be-41ea-881f-a8c0c11c1ffd',
  nome: 'Maria Souza',
};
const MARCOS = {
  id: '5b0e9a77-3c1d-4f2e-9a8b-7c6d5e4f3a21',
  nome: 'Marcos Lima',
};

/** Busca por nome sem acento, como a API, e por documento com ou sem máscara. */
function mockBusca() {
  const buscas: string[] = [];
  server.use(
    http.get('/v1/clientes', ({ request, response }) => {
      const q = new URL(request.url).searchParams.get('q') ?? '';
      buscas.push(q);
      const digitos = q.replace(/\D/g, '');
      const data =
        digitos === '52998224725'
          ? [MARIA]
          : [MARIA, MARCOS].filter((cliente) =>
              cliente.nome.toLowerCase().includes(q.toLowerCase()),
            );
      return response(200).json({
        data,
        meta: { page: 1, pageSize: 8, total: data.length, totalPages: 1 },
      });
    }),
  );
  return buscas;
}

function Exemplo({
  inicial = null,
  onCadastrarNovo,
}: {
  inicial?: ClienteResumo | null;
  onCadastrarNovo?: () => void;
}) {
  const [cliente, setCliente] = useState<ClienteResumo | null>(inicial);

  return (
    <>
      <BuscaCliente
        value={cliente}
        onChange={setCliente}
        onCadastrarNovo={onCadastrarNovo}
        required
      />
      <output aria-label="Escolhido">{cliente?.id ?? 'nenhum'}</output>
      <button type="button" onClick={() => setCliente(MARCOS)}>
        Escolher de fora
      </button>
    </>
  );
}

function renderBusca(props: Parameters<typeof Exemplo>[0] = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Exemplo {...props} />
    </QueryClientProvider>,
  );
}

function campo() {
  return screen.getByRole('combobox', { name: /Cliente/ });
}

describe('BuscaCliente', () => {
  it('busca por nome e escolhe com o mouse, sem violações', async () => {
    const buscas = mockBusca();
    const user = userEvent.setup();
    const { container } = renderBusca();

    await user.type(campo(), 'mar');
    expect(campo()).toHaveAttribute('aria-expanded', 'true');
    await user.click(
      await screen.findByRole('option', { name: 'Marcos Lima' }),
    );

    expect(campo()).toHaveValue('Marcos Lima');
    expect(campo()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Escolhido')).toHaveTextContent(MARCOS.id);
    // Uma busca só, depois da espera, e não uma por tecla.
    expect(buscas).toEqual(['mar']);
    await expectNoA11yViolations(container);
  });

  it('encontra pelo documento com máscara e escolhe pelo teclado', async () => {
    mockBusca();
    const user = userEvent.setup();
    renderBusca();

    await user.type(campo(), '529.982.247-25');
    await screen.findByRole('option', { name: 'Maria Souza' });
    await user.keyboard('{ArrowDown}');

    expect(campo()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Maria Souza' }).id,
    );
    expect(screen.getByRole('option', { name: 'Maria Souza' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Enter}');

    expect(campo()).toHaveValue('Maria Souza');
    expect(screen.getByLabelText('Escolhido')).toHaveTextContent(MARIA.id);
  });

  it('as setas dão a volta na lista, e Esc fecha', async () => {
    mockBusca();
    const user = userEvent.setup();
    renderBusca();

    await user.type(campo(), 'mar');
    await screen.findByRole('option', { name: 'Marcos Lima' });
    await user.keyboard('{ArrowUp}');

    expect(screen.getByRole('option', { name: 'Marcos Lima' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{Escape}');

    expect(campo()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Escolhido')).toHaveTextContent('nenhum');
  });

  it('mudar o texto desfaz a escolha, sem apagar o que foi digitado', async () => {
    mockBusca();
    const user = userEvent.setup();
    renderBusca({ inicial: MARIA });

    expect(campo()).toHaveValue('Maria Souza');

    await user.type(campo(), 'x');

    expect(campo()).toHaveValue('Maria Souzax');
    expect(screen.getByLabelText('Escolhido')).toHaveTextContent('nenhum');
  });

  it('mostra uma escolha feita fora do campo', async () => {
    const user = userEvent.setup();
    renderBusca();

    await user.click(screen.getByRole('button', { name: 'Escolher de fora' }));

    expect(campo()).toHaveValue('Marcos Lima');
  });

  it('avisa quando não encontra e oferece o cadastro', async () => {
    mockBusca();
    const onCadastrarNovo = vi.fn<() => void>();
    const user = userEvent.setup();
    renderBusca({ onCadastrarNovo });

    await user.click(campo());
    expect(screen.getByText('Digite o nome ou o CPF/CNPJ')).toBeInTheDocument();

    await user.type(campo(), 'zzz');

    expect(
      await screen.findByText('Nenhum cliente encontrado'),
    ).toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');

    expect(onCadastrarNovo).toHaveBeenCalledOnce();
  });

  it('avisa a falha da busca', async () => {
    server.use(
      mswHttp.get('*/v1/clientes', () =>
        HttpResponse.json(
          makeErrorResponse({
            statusCode: 500,
            code: 'ERRO_INTERNO',
            message: 'Internal server error',
          }),
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderBusca();

    await user.type(campo(), 'mar');

    await waitFor(() =>
      expect(
        screen.getByText('Não foi possível buscar os clientes'),
      ).toBeInTheDocument(),
    );
  });
});
