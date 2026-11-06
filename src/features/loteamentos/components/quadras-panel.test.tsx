import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { ToastProvider } from '@/shared/ui/toast';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeQuadra } from '@/test/factories/quadra.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import type { Quadra } from '../api/loteamentos.api';
import { QuadrasPanel } from './quadras-panel';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const LOTEAMENTO_ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const QUADRA = makeQuadra({ loteamentoId: LOTEAMENTO_ID, numero: 'A' });
const DUPLICADA = 'Já existe uma quadra com esse número neste loteamento';

function renderPainel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <QuadrasPanel loteamentoId={LOTEAMENTO_ID} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function mockPerfil(perfil: Perfil) {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id: '7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        nome: 'Pessoa Teste',
        email: 'pessoa@exemplo.com',
        perfil,
      }),
    ),
  );
}

/** A lista muda com as mutações, como na API: é o que prova a invalidação. */
function mockLista(inicial: Quadra[] = [QUADRA]) {
  const estado = { linhas: inicial, buscas: [] as string[] };
  server.use(
    http.get(
      '/v1/loteamentos/{loteamentoId}/quadras',
      ({ request, response }) => {
        estado.buscas.push(new URL(request.url).search);
        return response(200).json({
          data: estado.linhas,
          meta: {
            page: 1,
            pageSize: 20,
            total: estado.linhas.length,
            totalPages: 1,
          },
        });
      },
    ),
  );
  return estado;
}

function mockErro(
  method: 'post' | 'patch' | 'delete',
  url: string,
  code: string,
  message: string,
) {
  server.use(
    http.untyped[method](url, () =>
      HttpResponse.json(makeErrorResponse({ statusCode: 409, code, message }), {
        status: 409,
      }),
    ),
  );
}

beforeEach(() => {
  setTestUrl(`/loteamentos/${LOTEAMENTO_ID}`);
});

describe('QuadrasPanel', () => {
  it('Consulta vê a lista, sem o cadastro e sem as ações', async () => {
    mockPerfil('CONSULTA');
    mockLista();

    renderPainel();

    expect(await screen.findByText('A')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Número/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Adicionar quadra' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Ações' }),
    ).not.toBeInTheDocument();
  });

  it('o Gestor vê o cadastro e as ações, sem violações de acessibilidade', async () => {
    mockPerfil('GESTOR');
    mockLista();

    const { container } = renderPainel();

    expect(
      await screen.findByRole('button', { name: 'Editar a quadra A' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remover a quadra A' }),
    ).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('mostra a lista vazia', async () => {
    mockPerfil('GESTOR');
    mockLista([]);

    renderPainel();

    expect(
      await screen.findByText('Nenhuma quadra cadastrada'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Adicione a primeira quadra acima.'),
    ).toBeInTheDocument();
  });

  it('mostra o erro da busca e permite tentar de novo', async () => {
    mockPerfil('CONSULTA');
    server.use(
      http.untyped.get('*/v1/loteamentos/:id/quadras', () =>
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

    renderPainel();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
  });

  it('busca a página que está na URL', async () => {
    setTestUrl(`/loteamentos/${LOTEAMENTO_ID}?page=2`);
    mockPerfil('CONSULTA');
    const lista = mockLista();

    renderPainel();

    await screen.findByText('A');
    expect(lista.buscas[0]).toBe('?page=2&pageSize=20');
  });

  it('a quadra criada aparece na lista sem recarregar, e o campo fica pronto para a próxima', async () => {
    mockPerfil('GESTOR');
    const lista = mockLista([]);
    const criadas: unknown[] = [];
    server.use(
      http.untyped.post('*/v1/loteamentos/:id/quadras', async ({ request }) => {
        const corpo = (await request.json()) as { numero: string };
        criadas.push(corpo);
        const quadra = makeQuadra({ numero: corpo.numero });
        lista.linhas = [quadra];
        return HttpResponse.json(quadra, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPainel();

    await screen.findByText('Nenhuma quadra cadastrada');
    const campo = screen.getByLabelText(/Número/);
    await user.type(campo, '  B ');
    await user.click(screen.getByRole('button', { name: 'Adicionar quadra' }));

    expect(
      await screen.findByRole('button', { name: 'Editar a quadra B' }),
    ).toBeInTheDocument();
    expect(criadas).toEqual([{ numero: 'B' }]);
    expect(screen.getByText('Quadra cadastrada')).toBeInTheDocument();
    await waitFor(() => expect(campo).toHaveValue(''));
    expect(campo).toHaveFocus();
  });

  it('valida o número antes de chamar a API', async () => {
    mockPerfil('GESTOR');
    mockLista([]);
    const user = userEvent.setup();
    renderPainel();

    await screen.findByText('Nenhuma quadra cadastrada');
    await user.click(screen.getByRole('button', { name: 'Adicionar quadra' }));

    expect(await screen.findByText('Informe o número')).toBeInTheDocument();
  });

  it('mostra a duplicidade no campo e mantém o que foi digitado', async () => {
    mockPerfil('GESTOR');
    mockLista();
    mockErro(
      'post',
      '*/v1/loteamentos/:id/quadras',
      'QUADRA_JA_EXISTE',
      DUPLICADA,
    );
    const user = userEvent.setup();
    renderPainel();

    await screen.findByText('A');
    const campo = screen.getByLabelText(/Número/);
    await user.type(campo, 'a');
    await user.click(screen.getByRole('button', { name: 'Adicionar quadra' }));

    expect(await screen.findByText(DUPLICADA)).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveValue('a');
  });

  it('edita pelo diálogo, que fecha e atualiza a lista', async () => {
    mockPerfil('GESTOR');
    const lista = mockLista();
    server.use(
      http.untyped.patch('*/v1/quadras/:id', async ({ request }) => {
        const { numero } = (await request.json()) as { numero: string };
        const quadra = { ...QUADRA, numero };
        lista.linhas = [quadra];
        return HttpResponse.json(quadra);
      }),
    );
    const user = userEvent.setup();
    renderPainel();

    await user.click(
      await screen.findByRole('button', { name: 'Editar a quadra A' }),
    );
    const dialogo = await screen.findByRole('dialog', {
      name: 'Editar a quadra A',
    });
    const campo = within(dialogo).getByLabelText(/Número/);
    expect(campo).toHaveValue('A');
    await user.clear(campo);
    await user.type(campo, 'C');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByRole('button', { name: 'Editar a quadra C' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Quadra atualizada')).toBeInTheDocument();
  });

  it('na edição, a duplicidade mantém o diálogo aberto com o erro no campo', async () => {
    mockPerfil('GESTOR');
    mockLista();
    mockErro('patch', '*/v1/quadras/:id', 'QUADRA_JA_EXISTE', DUPLICADA);
    const user = userEvent.setup();
    renderPainel();

    await user.click(
      await screen.findByRole('button', { name: 'Editar a quadra A' }),
    );
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/Número/), '1');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText(DUPLICADA)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('com lotes vinculados, mantém a confirmação aberta e mostra o motivo', async () => {
    mockPerfil('GESTOR');
    const motivo = 'Não é possível excluir uma quadra com lotes cadastrados';
    mockLista();
    mockErro('delete', '*/v1/quadras/:id', 'QUADRA_COM_LOTES', motivo);
    const user = userEvent.setup();
    renderPainel();

    await user.click(
      await screen.findByRole('button', { name: 'Remover a quadra A' }),
    );
    const dialogo = await screen.findByRole('dialog');
    await user.click(
      within(dialogo).getByRole('button', { name: 'Remover quadra' }),
    );

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(motivo);
    expect(
      screen.getByRole('button', { name: 'Editar a quadra A', hidden: true }),
    ).toBeInTheDocument();
  });

  it('remove depois de confirmar e tira a quadra da lista', async () => {
    mockPerfil('GESTOR');
    const lista = mockLista();
    const removidas: string[] = [];
    server.use(
      http.untyped.delete('*/v1/quadras/:id', ({ params }) => {
        removidas.push(String(params.id));
        lista.linhas = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderPainel();

    await user.click(
      await screen.findByRole('button', { name: 'Remover a quadra A' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Remover quadra' }),
    );

    expect(
      await screen.findByText('Nenhuma quadra cadastrada'),
    ).toBeInTheDocument();
    expect(removidas).toEqual([QUADRA.id]);
    expect(screen.getByText('Quadra removida')).toBeInTheDocument();
  });
});
