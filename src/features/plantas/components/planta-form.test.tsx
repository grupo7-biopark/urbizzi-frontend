import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { makePlanta } from '@/test/factories/planta.factory';
import { setTestUrl } from '@/test/next-navigation';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { ToastProvider } from '@/shared/ui/toast';
import { PlantaForm } from './planta-form';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const ROTA = '*/api/backend/v1/plantas';

function makeFile(nome: string) {
  return new File(['conteudo'], nome, { type: 'image/png' });
}

function renderForm() {
  return renderWithQuery(
    <ToastProvider>
      <PlantaForm />
    </ToastProvider>,
  );
}

function selecionar(...nomes: string[]) {
  fireEvent.change(screen.getByLabelText(/Arquivos/), {
    target: { files: nomes.map(makeFile) },
  });
}

function preencherNome(nome = 'Masterplan 2026') {
  fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: nome } });
}

function enviar() {
  fireEvent.click(screen.getByRole('button', { name: 'Enviar planta' }));
}

function mockErro(code: string, message: string, statusCode = 400) {
  server.use(
    http.post(ROTA, () =>
      HttpResponse.json(makeErrorResponse({ statusCode, code, message }), {
        status: statusCode,
      }),
    ),
  );
}

beforeEach(() => {
  setTestUrl('/plantas/nova');
});

describe('PlantaForm', () => {
  it('oferece voltar à lista sem enviar', () => {
    renderForm();

    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
      'href',
      '/plantas',
    );
  });

  it('mostra a pré-visualização da grade completa, sem nenhum problema', () => {
    renderForm();

    selecionar('fatia_01_01.png', 'fatia_01_02.png');

    expect(screen.getByText('Grade 1 x 2: 2 de 2 fatias')).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', { name: 'Pré-visualização da grade' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('avisa a grade incompleta logo ao escolher os arquivos', async () => {
    renderForm();

    selecionar('fatia_01_01.png', 'fatia_01_02.png', 'fatia_02_01.png');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A grade 2 x 2 está incompleta. Faltam: fatia_02_02.',
    );
    expect(screen.getByText('Grade 2 x 2: 3 de 4 fatias')).toBeInTheDocument();
    expect(screen.getByText('Falta')).toBeInTheDocument();
    await expectNoA11yViolations();
  });

  it('não chama a API com a grade incompleta', async () => {
    let chamadas = 0;
    server.use(
      http.post(ROTA, () => {
        chamadas += 1;
        return HttpResponse.json(makePlanta());
      }),
    );
    renderForm();
    preencherNome();
    selecionar('fatia_01_01.png', 'fatia_02_02.png');

    enviar();

    expect(
      await screen.findByText(
        'Corrija os problemas dos arquivos antes de enviar',
      ),
    ).toBeInTheDocument();
    expect(chamadas).toBe(0);
  });

  it('exige o nome e os arquivos', async () => {
    renderForm();

    enviar();

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(
      screen.getByText('Selecione a imagem da planta ou as fatias'),
    ).toBeInTheDocument();
  });

  it('identifica a imagem única, sem grade', () => {
    renderForm();

    selecionar('masterplan.png');

    expect(
      screen.getByText(/Imagem única: masterplan\.png/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Pré-visualização da grade' }),
    ).not.toBeInTheDocument();
  });

  it('envia o nome e os arquivos, e volta à lista', async () => {
    const corpos: string[] = [];
    server.use(
      http.post(ROTA, async ({ request }) => {
        // Como texto: o parser de multipart do Node não reconhece o File do jsdom.
        corpos.push(await request.text());
        return HttpResponse.json(makePlanta(), { status: 201 });
      }),
    );
    renderForm();
    preencherNome();
    selecionar('fatia_01_01.png', 'fatia_01_02.png');

    enviar();

    await waitFor(() => expect(window.location.pathname).toBe('/plantas'));
    const [corpo] = corpos;
    expect(corpo).toMatch(/name="nome"\r\n\r\nMasterplan 2026/);
    expect(corpo).not.toContain('copiarMarcadores');
    expect(corpo).toContain('name="arquivos"; filename="fatia_01_01.png"');
    expect(corpo).toContain('name="arquivos"; filename="fatia_01_02.png"');
    expect(
      await screen.findByText(
        'Planta enviada. Acompanhe o processamento na lista.',
      ),
    ).toBeInTheDocument();
  });

  it('pede a cópia dos marcadores quando a opção é marcada', async () => {
    const corpos: string[] = [];
    server.use(
      http.post(ROTA, async ({ request }) => {
        // Como texto: o parser de multipart do Node não reconhece o File do jsdom.
        corpos.push(await request.text());
        return HttpResponse.json(makePlanta(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderForm();
    preencherNome();
    selecionar('masterplan.png');
    await user.click(
      screen.getByLabelText('Copiar os marcadores da planta ativa'),
    );

    enviar();

    await waitFor(() => expect(window.location.pathname).toBe('/plantas'));
    expect(corpos[0]).toMatch(/name="copiarMarcadores"\r\n\r\ntrue/);
  });

  it('mostra no campo a cópia pedida sem planta ativa', async () => {
    mockErro('PLANTA_ATIVA_NAO_ENCONTRADA', 'Nenhuma planta ativa', 404);
    renderForm();
    preencherNome();
    selecionar('masterplan.png');

    enviar();

    expect(await screen.findByText('Nenhuma planta ativa')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Copiar os marcadores da planta ativa'),
    ).toHaveAttribute('aria-invalid', 'true');
    expect(window.location.pathname).toBe('/plantas/nova');
  });

  it('mostra no campo o erro dos arquivos devolvido pela API', async () => {
    mockErro(
      'PLANTA_FATIAS_DIMENSOES_DIFERENTES',
      'Todas as fatias devem ter 100 x 100 px',
    );
    renderForm();
    preencherNome();
    selecionar('masterplan.png');

    enviar();

    expect(
      await screen.findByText('Todas as fatias devem ter 100 x 100 px'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Arquivos/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('mostra no alerta do formulário um erro genérico', async () => {
    mockErro('ERRO_INTERNO', 'Internal server error', 500);
    renderForm();
    preencherNome();
    selecionar('masterplan.png');

    enviar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível concluir a operação.',
    );
  });

  it('mostra o progresso e permite cancelar o envio', async () => {
    server.use(
      http.post(ROTA, async () => {
        await delay('infinite');
        return HttpResponse.json(makePlanta());
      }),
    );
    renderForm();
    preencherNome();
    selecionar('masterplan.png');

    enviar();

    expect(
      await screen.findByRole('progressbar', { name: 'Progresso do envio' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enviar planta' }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar envio' }));

    expect(await screen.findByText('Envio cancelado')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/plantas/nova');
    expect(screen.getByRole('button', { name: 'Enviar planta' })).toBeEnabled();
  });

  it('interrompe o envio ao sair da tela', async () => {
    let requisicao: Request | undefined;
    server.use(
      http.post(ROTA, async ({ request }) => {
        requisicao = request;
        await delay('infinite');
        return HttpResponse.json(makePlanta());
      }),
    );
    const { unmount } = renderForm();
    preencherNome();
    selecionar('masterplan.png');
    enviar();
    await screen.findByRole('progressbar');
    await waitFor(() => expect(requisicao).toBeDefined());

    unmount();

    await waitFor(() => expect(requisicao?.signal.aborted).toBe(true));
  });

  it('avisa ao fechar a aba só durante o envio', async () => {
    server.use(
      http.post(ROTA, async () => {
        await delay('infinite');
        return HttpResponse.json(makePlanta());
      }),
    );
    function tentarFechar() {
      const evento = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(evento);
      return evento.defaultPrevented;
    }
    renderForm();
    preencherNome();
    selecionar('masterplan.png');

    expect(tentarFechar()).toBe(false);

    enviar();
    await screen.findByRole('progressbar');

    expect(tentarFechar()).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar envio' }));
    await screen.findByText('Envio cancelado');

    expect(tentarFechar()).toBe(false);
  });
});
