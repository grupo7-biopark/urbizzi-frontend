import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { setTestUrl } from '@/test/next-navigation';
import { server } from '@/test/server';
import type { ResultadoImportacao } from '../api/lotes.api';
import { ImportacaoLotes } from './importacao-lotes';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const ROTA = '*/api/backend/v1/lotes/importacao';

const VALIDA: ResultadoImportacao = {
  importado: false,
  totalLinhas: 2,
  lotes: 2,
  loteamentosNovos: 1,
  quadrasNovas: 1,
  erros: [],
};
const COM_ERROS: ResultadoImportacao = {
  ...VALIDA,
  lotes: 1,
  erros: [{ linha: 3, mensagens: ['area_m2 é obrigatório', 'Lote repetido'] }],
};

function renderTela() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ImportacaoLotes />
    </QueryClientProvider>,
  );
}

function selecionar(nome = 'lotes.csv') {
  fireEvent.change(screen.getByLabelText(/Planilha/), {
    target: { files: [new File(['conteudo'], nome)] },
  });
}

/** Responde na ordem e guarda os campos de cada envio, lidos do multipart. */
function mockEnvios(...respostas: ResultadoImportacao[]) {
  const envios: string[] = [];
  server.use(
    http.post(ROTA, async ({ request }) => {
      envios.push(await request.text());
      return HttpResponse.json(respostas[envios.length - 1]);
    }),
  );
  return envios;
}

function mockErro(code: string, message: string, statusCode = 422) {
  server.use(
    http.post(ROTA, () =>
      HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
        status: statusCode,
      }),
    ),
  );
}

async function validar(user: ReturnType<typeof userEvent.setup>) {
  selecionar();
  await user.click(screen.getByRole('button', { name: 'Validar planilha' }));
}

function campoDoEnvio(envio: string | undefined, nome: string) {
  return new RegExp(`name="${nome}"\\r\\n\\r\\n(\\w+)`).exec(envio ?? '')?.[1];
}

beforeEach(() => {
  setTestUrl('/lotes/importar');
});

describe('ImportacaoLotes', () => {
  it('oferece os modelos para baixar, sem violações de acessibilidade', async () => {
    const { container } = renderTela();

    expect(
      screen.getByRole('link', { name: 'Baixar modelo XLSX' }),
    ).toHaveAttribute(
      'href',
      '/api/backend/v1/lotes/importacao/modelo?formato=xlsx',
    );
    expect(
      screen.getByRole('link', { name: 'Baixar modelo CSV' }),
    ).toHaveAttribute(
      'href',
      '/api/backend/v1/lotes/importacao/modelo?formato=csv',
    );
    await expectNoA11yViolations(container);
  });

  it('exige a planilha antes de enviar', async () => {
    const envios = mockEnvios();
    const user = userEvent.setup();
    renderTela();

    await user.click(screen.getByRole('button', { name: 'Validar planilha' }));

    expect(await screen.findByText('Selecione a planilha')).toBeInTheDocument();
    expect(envios).toEqual([]);
  });

  it('valida sem gravar e mostra o resumo, com a confirmação habilitada', async () => {
    const envios = mockEnvios(VALIDA);
    const user = userEvent.setup();
    renderTela();

    await user.click(
      screen.getByLabelText(/Criar os loteamentos e as quadras/),
    );
    await validar(user);

    const confirmar = await screen.findByRole('button', {
      name: 'Confirmar importação',
    });
    expect(confirmar).toBeEnabled();
    expect(screen.getByText('Planilha: lotes.csv')).toBeInTheDocument();
    expect(screen.getByText('Lotes válidos')).toBeInTheDocument();
    expect(screen.getByText('Loteamentos novos')).toBeInTheDocument();
    expect(campoDoEnvio(envios[0], 'confirmar')).toBe('false');
    expect(campoDoEnvio(envios[0], 'criarCadastros')).toBe('true');
  });

  it('confirma o mesmo envio e mostra a quantidade importada', async () => {
    const envios = mockEnvios(VALIDA, { ...VALIDA, importado: true });
    const user = userEvent.setup();
    renderTela();

    await validar(user);
    await user.click(
      await screen.findByRole('button', { name: 'Confirmar importação' }),
    );

    expect(await screen.findByText('2 lotes importados.')).toBeInTheDocument();
    expect(campoDoEnvio(envios[1], 'confirmar')).toBe('true');
    expect(envios[1]).toContain('filename="lotes.csv"');
    expect(screen.getByRole('link', { name: 'Ver os lotes' })).toHaveAttribute(
      'href',
      '/lotes',
    );
  });

  it('usa o singular com um lote só', async () => {
    const um = { ...VALIDA, lotes: 1, totalLinhas: 1 };
    mockEnvios(um, { ...um, importado: true });
    const user = userEvent.setup();
    renderTela();

    await validar(user);
    await user.click(
      await screen.findByRole('button', { name: 'Confirmar importação' }),
    );

    expect(await screen.findByText('1 lote importado.')).toBeInTheDocument();
  });

  it('com erros, lista cada linha e não permite confirmar', async () => {
    mockEnvios(COM_ERROS);
    const user = userEvent.setup();
    renderTela();

    await validar(user);

    const tabela = await screen.findByRole('table', {
      name: 'Erros por linha',
    });
    expect(within(tabela).getByText('3')).toBeInTheDocument();
    expect(
      within(tabela).getByText('area_m2 é obrigatório'),
    ).toBeInTheDocument();
    expect(within(tabela).getByText('Lote repetido')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Nada foi gravado');
    expect(
      screen.getByRole('button', { name: 'Confirmar importação' }),
    ).toBeDisabled();
  });

  it('baixa o relatório de erros', async () => {
    mockEnvios(COM_ERROS);
    // O jsdom não implementa estas duas funções.
    const criar = vi.fn<(blob: Blob) => string>(() => 'blob:relatorio');
    const revogar = vi.fn<(url: string) => void>();
    URL.createObjectURL = criar;
    URL.revokeObjectURL = revogar;
    const clique = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderTela();

    await validar(user);
    await user.click(
      await screen.findByRole('button', { name: 'Baixar relatório de erros' }),
    );

    expect(clique).toHaveBeenCalledOnce();
    expect(criar.mock.calls[0]?.[0].type).toContain('text/csv');
    expect(revogar).toHaveBeenCalledWith('blob:relatorio');
    clique.mockRestore();
  });

  it('enviar outra planilha volta ao início e descarta a prévia', async () => {
    mockEnvios(COM_ERROS);
    const user = userEvent.setup();
    renderTela();

    await validar(user);
    await user.click(
      await screen.findByRole('button', { name: 'Enviar outra planilha' }),
    );

    expect(screen.getByLabelText(/Planilha/)).toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: 'Erros por linha' }),
    ).not.toBeInTheDocument();
  });

  it('mostra no campo um arquivo de formato inválido', async () => {
    const motivo = 'Envie um arquivo .csv ou .xlsx';
    mockErro('IMPORTACAO_FORMATO_INVALIDO', motivo);
    const user = userEvent.setup();
    renderTela();

    selecionar('lotes.txt');
    await user.click(screen.getByRole('button', { name: 'Validar planilha' }));

    expect(await screen.findByText(motivo)).toBeInTheDocument();
    expect(screen.getByLabelText(/Planilha/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(
      screen.queryByRole('button', { name: 'Confirmar importação' }),
    ).not.toBeInTheDocument();
  });

  it('se a planilha deixou de ser válida ao confirmar, mostra os novos erros', async () => {
    mockEnvios(VALIDA, COM_ERROS);
    const user = userEvent.setup();
    renderTela();

    await validar(user);
    await user.click(
      await screen.findByRole('button', { name: 'Confirmar importação' }),
    );

    expect(
      await screen.findByRole('table', { name: 'Erros por linha' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/importados/)).not.toBeInTheDocument();
  });

  it('mantém a prévia e mostra o erro se a confirmação falhar', async () => {
    let tentativas = 0;
    server.use(
      http.post(ROTA, () => {
        tentativas += 1;
        return tentativas === 1
          ? HttpResponse.json(VALIDA)
          : HttpResponse.json(
              makeErrorResponse({
                statusCode: 500,
                code: 'ERRO_INTERNO',
                message: 'Internal server error',
              }),
              { status: 500 },
            );
      }),
    );
    const user = userEvent.setup();
    renderTela();

    await validar(user);
    await user.click(
      await screen.findByRole('button', { name: 'Confirmar importação' }),
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível concluir a operação',
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Confirmar importação' }),
    ).toBeEnabled();
  });

  it('depois de concluir, permite importar outra planilha', async () => {
    mockEnvios(VALIDA, { ...VALIDA, importado: true });
    const user = userEvent.setup();
    renderTela();

    await validar(user);
    await user.click(
      await screen.findByRole('button', { name: 'Confirmar importação' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Importar outra planilha' }),
    );

    expect(screen.getByLabelText(/Planilha/)).toBeInTheDocument();
  });
});
