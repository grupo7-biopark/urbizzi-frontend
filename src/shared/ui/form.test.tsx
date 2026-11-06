import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { makeErrorResponse } from '@/test/factories/error-response.factory';
import { http } from '@/test/http';
import { server } from '@/test/server';
import {
  Form,
  FormInput,
  FormMaskedInput,
  FormSelect,
  FormTextarea,
} from './form';

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome'),
  descricao: z.string(),
  localizacao: z.string(),
  documento: z.string(),
  valor: z.string(),
  endereco: z.object({ cep: z.string() }),
});

type Valores = z.infer<typeof schema>;

const VAZIO: Valores = {
  nome: '',
  descricao: '',
  localizacao: '',
  documento: '',
  valor: '',
  endereco: { cep: '' },
};

function Exemplo({
  onSubmit,
  defaultValues = VAZIO,
}: {
  onSubmit: (values: Valores) => Promise<unknown>;
  defaultValues?: Valores;
}) {
  return (
    <Form
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      fieldsByCode={{ LOTEAMENTO_JA_EXISTE: 'nome' }}
    >
      <FormInput name="nome" label="Nome" required />
      <FormTextarea name="descricao" label="Descrição" />
      <FormSelect name="localizacao" label="Localização">
        <option value="">Não informada</option>
        <option value="Toledo">Toledo</option>
      </FormSelect>
      <FormMaskedInput name="documento" label="Documento" mask="cpfCnpj" />
      <FormMaskedInput name="valor" label="Valor" mask="moeda" />
      <FormInput name="endereco.cep" label="CEP" />
    </Form>
  );
}

describe('Form: resetAfterSubmit', () => {
  const schemaNome = z.object({ nome: z.string().min(1) });

  function FormSequencia({
    onSubmit,
  }: {
    onSubmit: (values: { nome: string }) => Promise<unknown>;
  }) {
    return (
      <Form
        schema={schemaNome}
        defaultValues={{ nome: '' }}
        onSubmit={onSubmit}
        resetAfterSubmit="nome"
      >
        <FormInput name="nome" label="Nome" />
      </Form>
    );
  }

  it('limpa e volta o foco ao campo depois de salvar', async () => {
    const user = userEvent.setup();
    render(<FormSequencia onSubmit={() => Promise.resolve()} />);

    await user.type(screen.getByLabelText('Nome'), 'A');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByLabelText('Nome')).toHaveValue(''));
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  it('mantém o que foi digitado quando a API recusa', async () => {
    const user = userEvent.setup();
    render(
      <FormSequencia onSubmit={() => Promise.reject(new Error('falha'))} />,
    );

    await user.type(screen.getByLabelText('Nome'), 'A');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('A');
  });
});

describe('Form: rodapé', () => {
  it('põe Cancelar como link ao lado do envio, só quando informado', () => {
    const { rerender } = render(
      <Form
        schema={schema}
        defaultValues={VAZIO}
        onSubmit={() => Promise.resolve()}
        cancelHref="/loteamentos"
      >
        <FormInput name="nome" label="Nome" />
      </Form>,
    );

    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
      'href',
      '/loteamentos',
    );

    rerender(
      <Form
        schema={schema}
        defaultValues={VAZIO}
        onSubmit={() => Promise.resolve()}
      >
        <FormInput name="nome" label="Nome" />
      </Form>,
    );

    expect(screen.queryByRole('link', { name: 'Cancelar' })).toBeNull();
  });
});

function enviarParaApi(values: Valores) {
  return unwrap(
    api.POST('/v1/loteamentos', {
      body: { nome: values.nome },
    }),
  );
}

function mockErroDaApi(status: number, code: string, details?: object[]) {
  server.use(
    http.untyped.post('*/v1/loteamentos', () =>
      HttpResponse.json(
        makeErrorResponse({
          statusCode: status,
          code,
          message: 'Mensagem da API',
          details: details as never,
        }),
        { status },
      ),
    ),
  );
}

async function preencherEEnviar() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Nome/), 'Bela Vista');
  await user.click(screen.getByRole('button', { name: 'Salvar' }));
  return user;
}

describe('Form', () => {
  it('envia os valores validados, com as máscaras retiradas', async () => {
    const onSubmit = vi.fn<(values: Valores) => Promise<unknown>>(() =>
      Promise.resolve(),
    );
    const user = userEvent.setup();
    render(<Exemplo onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Nome/), '  Bela Vista  ');
    await user.type(screen.getByLabelText('Descrição'), 'Texto');
    await user.selectOptions(screen.getByLabelText('Localização'), 'Toledo');
    await user.type(screen.getByLabelText('Documento'), '52998224725');
    await user.type(screen.getByLabelText('Valor'), '123456');
    await user.type(screen.getByLabelText('CEP'), '85900');

    expect(screen.getByLabelText('Documento')).toHaveValue('529.982.247-25');
    expect(screen.getByLabelText('Valor')).toHaveValue('R$ 1.234,56');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        nome: 'Bela Vista',
        descricao: 'Texto',
        localizacao: 'Toledo',
        documento: '52998224725',
        valor: '1234.56',
        endereco: { cep: '85900' },
      }),
    );
  });

  it('mostra os valores iniciais com máscara', () => {
    render(
      <Exemplo
        onSubmit={() => Promise.resolve()}
        defaultValues={{
          ...VAZIO,
          documento: '11222333000181',
          valor: '250000.00',
        }}
      />,
    );

    expect(screen.getByLabelText('Documento')).toHaveValue(
      '11.222.333/0001-81',
    );
    expect(screen.getByLabelText('Valor')).toHaveValue('R$ 250.000,00');
  });

  it('valida antes de chamar a API e liga o erro ao campo', async () => {
    const onSubmit = vi.fn<(values: Valores) => Promise<unknown>>();
    const user = userEvent.setup();
    render(<Exemplo onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    const erro = await screen.findByText('Informe o nome');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute(
      'aria-describedby',
      erro.id,
    );
  });

  it('mostra embaixo de cada campo o erro de validação da API', async () => {
    mockErroDaApi(400, 'DADOS_INVALIDOS', [
      { field: 'nome', messages: ['Nome já usado', 'Outra mensagem'] },
      { field: 'documento', messages: ['Documento inválido'] },
      { field: 'endereco.cep', messages: ['CEP inválido'] },
    ]);
    render(<Exemplo onSubmit={enviarParaApi} />);

    await preencherEEnviar();

    const nome = await screen.findByText('Nome já usado');
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute(
      'aria-describedby',
      nome.id,
    );
    expect(screen.queryByText('Outra mensagem')).not.toBeInTheDocument();
    expect(screen.getByText('Documento inválido')).toBeInTheDocument();
    expect(screen.getByLabelText('Documento')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    // Caminho aninhado, como a API envia e como o react-hook-form entende.
    const cep = screen.getByText('CEP inválido');
    expect(screen.getByLabelText('CEP')).toHaveAttribute(
      'aria-describedby',
      cep.id,
    );

    // A API pode citar um campo que a tela não mostra: o alerta garante o aviso.
    expect(
      screen.getByText('Os dados enviados são inválidos. Confira os campos.'),
    ).toBeInTheDocument();
  });

  it('leva ao foco o primeiro campo com erro da API', async () => {
    mockErroDaApi(400, 'DADOS_INVALIDOS', [
      { field: 'nome', messages: ['Nome já usado'] },
    ]);
    render(<Exemplo onSubmit={enviarParaApi} />);

    await preencherEEnviar();

    await screen.findByText('Nome já usado');
    await waitFor(() => expect(screen.getByLabelText(/Nome/)).toHaveFocus());
  });

  it('mostra no campo um conflito ligado a ele pelo código', async () => {
    mockErroDaApi(409, 'LOTEAMENTO_JA_EXISTE');
    render(<Exemplo onSubmit={enviarParaApi} />);

    await preencherEEnviar();

    expect(await screen.findByText('Mensagem da API')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('mostra no alerta o erro que não é de campo', async () => {
    mockErroDaApi(403, 'ACESSO_NEGADO');
    render(<Exemplo onSubmit={enviarParaApi} />);

    await preencherEEnviar();

    await waitFor(() =>
      expect(
        screen.getByText('Você não tem permissão para executar esta ação.'),
      ).toHaveAttribute('role', 'alert'),
    );
  });

  it('não expõe a mensagem de uma exceção do JavaScript', async () => {
    render(
      <Exemplo
        onSubmit={() => Promise.reject(new TypeError('x is undefined'))}
      />,
    );

    await preencherEEnviar();

    await screen.findByText(/Não foi possível concluir a operação/);
    expect(screen.queryByText('x is undefined')).not.toBeInTheDocument();
  });

  it('desativa o botão durante o envio e limpa o erro ao tentar de novo', async () => {
    let rejeitar: (motivo: unknown) => void = () => undefined;
    const onSubmit = vi
      .fn<(values: Valores) => Promise<unknown>>()
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejeitar = reject;
          }),
      )
      .mockResolvedValue(undefined);
    render(<Exemplo onSubmit={onSubmit} />);

    const user = await preencherEEnviar();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled(),
    );

    rejeitar(new Error('falhou'));
    await screen.findByText(/Não foi possível concluir a operação/);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(
        screen.queryByText(/Não foi possível concluir a operação/),
      ).not.toBeInTheDocument(),
    );
  });
});
