import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makePlanta } from '@/test/factories/planta.factory';
import { expectNoA11yViolations } from '@/test/a11y';
import { http } from '@/test/http';
import { setTestUrl } from '@/test/next-navigation';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { ToastProvider } from '@/shared/ui/toast';
import type { Planta } from '../api/plantas.api';
import { PlantasTable } from './plantas-table';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const SEARCH = { page: 1, pageSize: 20 };

function makeLista(data: Planta[]) {
  return {
    data,
    meta: { page: 1, pageSize: 20, total: data.length, totalPages: 1 },
  };
}

function mockLista(...plantas: Planta[]) {
  server.use(
    http.get('/v1/plantas', ({ response }) =>
      response(200).json(makeLista(plantas)),
    ),
  );
}

function renderTabela() {
  return renderWithQuery(
    <ToastProvider>
      <PlantasTable search={SEARCH} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  setTestUrl('/plantas');
});

describe('PlantasTable', () => {
  it('mostra o carregamento', () => {
    mockLista();

    renderTabela();

    expect(
      screen.getByLabelText('Carregando: Versões da planta'),
    ).toBeInTheDocument();
  });

  it('mostra o estado vazio com a ação de enviar', async () => {
    mockLista();

    renderTabela();

    expect(
      await screen.findByText('Nenhuma planta enviada'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enviar planta' })).toHaveAttribute(
      'href',
      '/plantas/nova',
    );
  });

  it('mostra o erro da API, com a opção de tentar novamente', async () => {
    server.use(
      http.get('/v1/plantas', ({ response }) =>
        response(401).json(
          makeErrorResponse({
            statusCode: 401,
            code: 'ERRO_QUALQUER',
            message: 'Não foi possível listar',
          }),
        ),
      ),
    );

    renderTabela();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível listar',
    );
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
  });

  it('lista as versões, com o status e qual está ativa', async () => {
    mockLista(
      makePlanta({ id: '3', versao: 3, nome: 'Nova', status: 'PROCESSANDO' }),
      makePlanta({
        id: '2',
        versao: 2,
        nome: 'Atual',
        status: 'PRONTA',
        ativa: true,
        gradeLinhas: 3,
        gradeColunas: 2,
      }),
    );

    renderTabela();

    const linhaNova = (await screen.findByText('Nova')).closest('tr');
    const linhaAtual = screen.getByText('Atual').closest('tr');

    expect(within(linhaNova!).getByText('Processando')).toBeInTheDocument();
    expect(within(linhaNova!).getByText('Imagem única')).toBeInTheDocument();
    expect(within(linhaNova!).queryByText('Ativa')).not.toBeInTheDocument();
    expect(within(linhaAtual!).getByText('Pronta')).toBeInTheDocument();
    expect(within(linhaAtual!).getByText('Ativa')).toBeInTheDocument();
    expect(within(linhaAtual!).getByText('3 x 2')).toBeInTheDocument();
    await expectNoA11yViolations();
  });

  it('exibe a mensagem do erro no processamento', async () => {
    mockLista(
      makePlanta({
        status: 'ERRO',
        mensagemErro: 'Não foi possível processar os arquivos enviados',
      }),
    );

    renderTabela();

    expect(await screen.findByText('Erro')).toBeInTheDocument();
    expect(
      screen.getByText('Não foi possível processar os arquivos enviados'),
    ).toBeInTheDocument();
  });

  it('tem uma mensagem própria para erro sem motivo informado', async () => {
    mockLista(makePlanta({ status: 'ERRO', mensagemErro: null }));

    renderTabela();

    expect(
      await screen.findByText('Não foi possível processar esta planta.'),
    ).toBeInTheDocument();
  });

  it('o status muda para pronta sem recarregar', async () => {
    let consultas = 0;
    server.use(
      http.get('/v1/plantas', ({ response }) => {
        consultas += 1;
        return response(200).json(
          makeLista([
            makePlanta({ status: consultas === 1 ? 'PROCESSANDO' : 'PRONTA' }),
          ]),
        );
      }),
    );

    renderTabela();

    expect(await screen.findByText('Processando')).toBeInTheDocument();
    expect(
      await screen.findByText('Pronta', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Processando')).not.toBeInTheDocument();
    // Espera de verdade pelo intervalo de atualização, acima do limite padrão de 5 s.
  }, 15_000);

  it.each(['ENVIADA', 'PROCESSANDO', 'ERRO'] as const)(
    'não oferece ativar uma planta %s',
    async (status) => {
      mockLista(makePlanta({ status }));

      renderTabela();

      await screen.findByText('Masterplan Teste');
      expect(
        screen.queryByRole('button', { name: /Ativar/ }),
      ).not.toBeInTheDocument();
    },
  );

  it('não oferece ativar a planta que já está ativa', async () => {
    mockLista(makePlanta({ status: 'PRONTA', ativa: true }));

    renderTabela();

    await screen.findByText('Masterplan Teste');
    expect(
      screen.queryByRole('button', { name: /Ativar/ }),
    ).not.toBeInTheDocument();
  });

  it('ativa a planta pronta depois de confirmar e atualiza a lista', async () => {
    const user = userEvent.setup();
    let ativa = false;
    server.use(
      http.get('/v1/plantas', ({ response }) =>
        response(200).json(
          makeLista([makePlanta({ status: 'PRONTA', ativa })]),
        ),
      ),
      http.post('/v1/plantas/{id}/ativar', ({ response }) => {
        ativa = true;
        return response(200).json(makePlanta({ status: 'PRONTA', ativa }));
      }),
    );
    renderTabela();

    await user.click(
      await screen.findByRole('button', { name: 'Ativar a versão 1' }),
    );
    const dialogo = await screen.findByRole('dialog', {
      name: 'Ativar a versão 1 da planta?',
    });
    await user.click(
      within(dialogo).getByRole('button', { name: 'Ativar planta' }),
    );

    expect(await screen.findByText('Ativa')).toBeInTheDocument();
    expect(await screen.findByText('Planta ativada')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ativar a versão 1' }),
    ).not.toBeInTheDocument();
  });

  it('não ativa ao desistir na confirmação', async () => {
    const user = userEvent.setup();
    mockLista(makePlanta({ status: 'PRONTA' }));
    renderTabela();

    await user.click(
      await screen.findByRole('button', { name: 'Ativar a versão 1' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Voltar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('Ativa')).not.toBeInTheDocument();
  });

  it('mantém o diálogo aberto com a mensagem de um conflito', async () => {
    const user = userEvent.setup();
    mockLista(makePlanta({ status: 'PRONTA' }));
    server.use(
      http.post('/v1/plantas/{id}/ativar', ({ response }) =>
        response(409).json(
          makeErrorResponse({
            statusCode: 409,
            code: 'PLANTA_NAO_PRONTA',
            message: 'A planta ainda não está pronta',
          }),
        ),
      ),
    );
    renderTabela();

    await user.click(
      await screen.findByRole('button', { name: 'Ativar a versão 1' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Ativar planta' }),
    );

    const dialogo = await screen.findByRole('dialog');
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'A planta ainda não está pronta',
    );
  });

  it('mostra o 403 da API, mesmo com a ação visível', async () => {
    const user = userEvent.setup();
    mockLista(makePlanta({ status: 'PRONTA' }));
    server.use(
      http.post('/v1/plantas/{id}/ativar', ({ response }) =>
        response(403).json(
          makeErrorResponse({
            statusCode: 403,
            code: 'ACESSO_NEGADO',
            message: 'Forbidden resource',
          }),
        ),
      ),
    );
    renderTabela();

    await user.click(
      await screen.findByRole('button', { name: 'Ativar a versão 1' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Ativar planta' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Você não tem permissão para executar esta ação.',
    );
  });
});
