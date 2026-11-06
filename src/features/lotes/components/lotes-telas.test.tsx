import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Perfil } from '@/shared/auth/permissoes';
import { ToastProvider } from '@/shared/ui/toast';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makeLote } from '@/test/factories/lote.factory';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import { makeQuadra } from '@/test/factories/quadra.factory';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import { lotesSearchSchema } from '../schemas/lotes-search.schema';
import { EditarLote } from './editar-lote';
import { NovoLoteForm } from './lote-form';
import { LotesTable } from './lotes-table';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const LOTEAMENTO = makeLoteamento({ nome: 'Bela Vista' });
const QUADRA = makeQuadra({ numero: 'Q1' });
const LOTE = makeLote({
  loteamentoId: LOTEAMENTO.id,
  quadraId: QUADRA.id,
  numero: '12',
});
const META = { page: 1, pageSize: 20, total: 1, totalPages: 1 };

function renderTela(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

function renderLista(busca: Record<string, string> = {}) {
  return renderTela(<LotesTable search={lotesSearchSchema.parse(busca)} />);
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

function mockCadastros() {
  server.use(
    http.get('/v1/loteamentos', ({ response }) =>
      response(200).json({ data: [LOTEAMENTO], meta: META }),
    ),
    http.get('/v1/loteamentos/{id}', ({ response }) =>
      response(200).json(LOTEAMENTO),
    ),
    http.get('/v1/loteamentos/{loteamentoId}/quadras', ({ response }) =>
      response(200).json({ data: [QUADRA], meta: META }),
    ),
    http.get('/v1/quadras/{id}', ({ response }) => response(200).json(QUADRA)),
  );
}

function mockLista(linhas = [LOTE]) {
  const buscas: string[] = [];
  server.use(
    http.get('/v1/lotes', ({ request, response }) => {
      buscas.push(new URL(request.url).search);
      return response(200).json({
        data: linhas,
        meta: { ...META, total: linhas.length },
      });
    }),
  );
  return buscas;
}

function mockErro(
  method: 'post' | 'patch' | 'delete' | 'get',
  url: string,
  statusCode: number,
  code: string,
  message: string,
) {
  server.use(
    http.untyped[method](url, () =>
      HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
        status: statusCode,
      }),
    ),
  );
}

beforeEach(() => {
  setTestUrl('/lotes');
  mockCadastros();
});

describe('LotesTable', () => {
  it('mostra as colunas, com os nomes, a área, o valor e o status', async () => {
    mockPerfil('CONSULTA');
    mockLista([makeLote({ ...LOTE, exibirValorPublico: true })]);

    renderLista();

    const linha = (await screen.findByRole('link', { name: '12' })).closest(
      'tr',
    ) as HTMLElement;
    expect(await within(linha).findByText('Bela Vista')).toBeInTheDocument();
    expect(await within(linha).findByText('Q1')).toBeInTheDocument();
    expect(within(linha).getByText('360,00 m²')).toBeInTheDocument();
    expect(within(linha).getByText('R$ 250.000,00')).toBeInTheDocument();
    expect(within(linha).getByText('Disponível')).toBeInTheDocument();
    expect(within(linha).getByText('Sim')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '12' })).toHaveAttribute(
      'href',
      `/lotes/${LOTE.id}`,
    );
  });

  it('avisa quando o valor não foi definido', async () => {
    mockPerfil('CONSULTA');
    mockLista([makeLote({ ...LOTE, valor: null })]);

    renderLista();

    expect(await screen.findByText('Não definido')).toBeInTheDocument();
  });

  it.each<Perfil>(['COMERCIAL', 'CONSULTA'])(
    '%s não vê as ações de edição',
    async (perfil) => {
      mockPerfil(perfil);
      mockLista();

      renderLista();

      await screen.findByRole('link', { name: '12' });
      expect(
        screen.queryByRole('link', { name: 'Editar o lote 12' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Remover o lote 12' }),
      ).not.toBeInTheDocument();
    },
  );

  it.each<Perfil>(['ADMINISTRADOR', 'GESTOR'])(
    '%s vê as ações, sem violações de acessibilidade',
    async (perfil) => {
      mockPerfil(perfil);
      mockLista();

      const { container } = renderLista();

      expect(
        await screen.findByRole('link', { name: 'Editar o lote 12' }),
      ).toHaveAttribute('href', `/lotes/${LOTE.id}/editar`);
      await screen.findByText('Bela Vista');
      await expectNoA11yViolations(container);
    },
  );

  it('envia os filtros combinados à API', async () => {
    mockPerfil('CONSULTA');
    const buscas = mockLista();

    renderLista({
      q: '12',
      status: 'RESERVADO',
      loteamentoId: LOTEAMENTO.id,
      quadraId: QUADRA.id,
    });

    await screen.findByRole('link', { name: '12' });
    const busca = new URLSearchParams(buscas[0]);
    expect(busca.get('q')).toBe('12');
    expect(busca.get('status')).toBe('RESERVADO');
    expect(busca.get('loteamentoId')).toBe(LOTEAMENTO.id);
    expect(busca.get('quadraId')).toBe(QUADRA.id);
  });

  it('o filtro de quadra depende do loteamento', async () => {
    mockPerfil('CONSULTA');
    mockLista();

    renderLista();

    expect(screen.getByLabelText('Quadra')).toBeDisabled();
  });

  it('trocar o loteamento limpa a quadra da URL e volta à primeira página', async () => {
    setTestUrl(
      `/lotes?loteamentoId=${LOTEAMENTO.id}&quadraId=${QUADRA.id}&page=2`,
    );
    mockPerfil('CONSULTA');
    mockLista();
    const user = userEvent.setup();

    renderLista({
      loteamentoId: LOTEAMENTO.id,
      quadraId: QUADRA.id,
      page: '2',
    });

    const filtro = screen.getByLabelText('Quadra');
    await waitFor(() => expect(filtro).toBeEnabled());
    await screen.findByRole('option', { name: 'Bela Vista' });
    await user.selectOptions(screen.getByLabelText('Loteamento'), '');

    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('mostra a lista vazia com a ação de cadastrar para quem pode', async () => {
    mockPerfil('GESTOR');
    mockLista([]);

    renderLista();

    expect(
      await screen.findByText('Nenhum lote cadastrado'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo lote' })).toHaveAttribute(
      'href',
      '/lotes/novo',
    );
  });

  it('mostra o erro da busca e permite tentar de novo', async () => {
    mockPerfil('CONSULTA');
    mockErro('get', '*/v1/lotes', 500, 'ERRO_INTERNO', 'Internal server error');

    renderLista();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
  });

  it('sem o nome da quadra, a linha continua utilizável', async () => {
    mockPerfil('CONSULTA');
    mockLista();
    mockErro(
      'get',
      '*/v1/quadras/:id',
      404,
      'QUADRA_NAO_ENCONTRADA',
      'Quadra não encontrada',
    );

    renderLista();

    expect(await screen.findByText('Não disponível')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '12' })).toBeInTheDocument();
  });

  it('um lote reservado não é removido, e a confirmação mostra o motivo', async () => {
    mockPerfil('GESTOR');
    mockLista([makeLote({ ...LOTE, status: 'RESERVADO' })]);
    mockErro(
      'delete',
      '*/v1/lotes/:id',
      409,
      'LOTE_NAO_DISPONIVEL',
      'Lote não disponível',
    );
    const user = userEvent.setup();
    renderLista();

    await user.click(
      await screen.findByRole('button', { name: 'Remover o lote 12' }),
    );
    const dialogo = await screen.findByRole('dialog');
    await user.click(
      within(dialogo).getByRole('button', { name: 'Remover lote' }),
    );

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Este lote não está mais disponível.',
    );
  });

  it('remove depois de confirmar', async () => {
    mockPerfil('GESTOR');
    mockLista();
    const removidos: string[] = [];
    server.use(
      http.untyped.delete('*/v1/lotes/:id', ({ params }) => {
        removidos.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderLista();

    await user.click(
      await screen.findByRole('button', { name: 'Remover o lote 12' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Remover lote' }),
    );

    await waitFor(() => expect(removidos).toEqual([LOTE.id]));
    expect(await screen.findByText('Lote removido')).toBeInTheDocument();
  });
});

describe('NovoLoteForm', () => {
  function capturarEnvio() {
    const corpos: unknown[] = [];
    server.use(
      http.untyped.post('*/v1/lotes', async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(LOTE, { status: 201 });
      }),
    );
    return corpos;
  }

  async function preencher(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByRole('option', { name: 'Bela Vista' });
    await user.selectOptions(
      screen.getByLabelText(/Loteamento/),
      LOTEAMENTO.id,
    );
    await screen.findByRole('option', { name: 'Q1' });
    await user.selectOptions(screen.getByLabelText(/Quadra/), QUADRA.id);
    await user.type(screen.getByLabelText(/Número/), '12');
    await user.type(screen.getByLabelText(/Área/), '36000');
  }

  beforeEach(() => {
    setTestUrl('/lotes/novo');
  });

  it('mostra área e valor com máscara e envia o que a API espera', async () => {
    const corpos = capturarEnvio();
    const user = userEvent.setup();
    renderTela(<NovoLoteForm />);

    await preencher(user);
    const valor = screen.getByLabelText(/Valor/);
    await user.type(valor, '25000000');
    expect(screen.getByLabelText(/Área/)).toHaveValue('360,00');
    expect(valor).toHaveValue('R$ 250.000,00');
    await user.click(screen.getByLabelText(/Exibir o valor/));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(window.location.pathname).toBe('/lotes'));
    expect(corpos).toEqual([
      {
        quadraId: QUADRA.id,
        numero: '12',
        areaM2: '360.00',
        valor: '250000.00',
        exibirValorPublico: true,
        observacoes: null,
      },
    ]);
  });

  it('não tem campo de status', async () => {
    renderTela(<NovoLoteForm />);

    await screen.findByRole('option', { name: 'Bela Vista' });
    expect(screen.queryByLabelText(/Status/)).not.toBeInTheDocument();
  });

  it('a quadra depende do loteamento, e trocá-lo limpa a escolha', async () => {
    const user = userEvent.setup();
    renderTela(<NovoLoteForm />);

    const quadra = screen.getByLabelText(/Quadra/);
    expect(quadra).toBeDisabled();
    expect(
      screen.getByText('Selecione o loteamento primeiro.'),
    ).toBeInTheDocument();

    await screen.findByRole('option', { name: 'Bela Vista' });
    await user.selectOptions(
      screen.getByLabelText(/Loteamento/),
      LOTEAMENTO.id,
    );
    await screen.findByRole('option', { name: 'Q1' });
    await user.selectOptions(quadra, QUADRA.id);
    expect(quadra).toHaveValue(QUADRA.id);

    await user.selectOptions(screen.getByLabelText(/Loteamento/), '');

    expect(quadra).toHaveValue('');
    expect(quadra).toBeDisabled();
  });

  it('valida os obrigatórios antes de chamar a API', async () => {
    const corpos = capturarEnvio();
    const user = userEvent.setup();
    renderTela(<NovoLoteForm />);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Selecione o loteamento'),
    ).toBeInTheDocument();
    expect(screen.getByText('Selecione a quadra')).toBeInTheDocument();
    expect(screen.getByText('Informe o número')).toBeInTheDocument();
    expect(screen.getByText('Informe a área')).toBeInTheDocument();
    expect(corpos).toEqual([]);
  });

  it('mostra o lote duplicado no campo número', async () => {
    const motivo = 'Já existe um lote com esse número nesta quadra';
    mockErro('post', '*/v1/lotes', 409, 'LOTE_JA_EXISTE', motivo);
    const user = userEvent.setup();
    renderTela(<NovoLoteForm />);

    await preencher(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(motivo)).toBeInTheDocument();
    expect(screen.getByLabelText(/Número/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(window.location.pathname).toBe('/lotes/novo');
  });

  it('avisa quando as opções de loteamento não carregam', async () => {
    mockErro(
      'get',
      '*/v1/loteamentos',
      500,
      'ERRO_INTERNO',
      'Internal server error',
    );

    renderTela(<NovoLoteForm />);

    expect(
      await screen.findByText(
        'Não foi possível concluir a operação. Tente novamente em instantes.',
      ),
    ).toBeInTheDocument();
  });
});

describe('EditarLote', () => {
  beforeEach(() => {
    setTestUrl(`/lotes/${LOTE.id}/editar`);
  });

  function mockDetalhe(lote = LOTE) {
    server.use(
      http.get('/v1/lotes/{id}', ({ response }) => response(200).json(lote)),
    );
  }

  it('preenche o formulário, com a quadra e o status só para leitura', async () => {
    mockDetalhe(makeLote({ ...LOTE, status: 'RESERVADO' }));

    renderTela(<EditarLote id={LOTE.id} />);

    expect(screen.getByLabelText('Carregando lote')).toBeInTheDocument();
    expect(await screen.findByLabelText(/Número/)).toHaveValue('12');
    expect(screen.getByLabelText(/Valor/)).toHaveValue('R$ 250.000,00');
    expect(await screen.findByText('Bela Vista')).toBeInTheDocument();
    expect(await screen.findByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Reservado')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('salva só os campos editáveis, limpando o valor, e volta à lista', async () => {
    mockDetalhe();
    const corpos: unknown[] = [];
    server.use(
      http.untyped.patch('*/v1/lotes/:id', async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(LOTE);
      }),
    );
    const user = userEvent.setup();
    renderTela(<EditarLote id={LOTE.id} />);

    await user.clear(await screen.findByLabelText(/Valor/));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(window.location.pathname).toBe('/lotes'));
    expect(corpos).toEqual([
      {
        numero: '12',
        areaM2: '360.00',
        valor: null,
        exibirValorPublico: false,
        observacoes: null,
      },
    ]);
  });

  it('avisa quando o lote não existe, sem oferecer tentar de novo', async () => {
    mockErro(
      'get',
      '*/v1/lotes/:id',
      404,
      'LOTE_NAO_ENCONTRADO',
      'Lote não encontrado',
    );

    renderTela(<EditarLote id={LOTE.id} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lote não encontrado',
    );
    expect(
      screen.getByRole('link', { name: 'Voltar aos lotes' }),
    ).toBeInTheDocument();
  });

  it('em uma falha temporária, permite tentar de novo', async () => {
    mockErro(
      'get',
      '*/v1/lotes/:id',
      500,
      'ERRO_INTERNO',
      'Internal server error',
    );

    renderTela(<EditarLote id={LOTE.id} />);

    expect(
      await screen.findByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
  });
});
