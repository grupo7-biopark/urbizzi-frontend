import { describe, expect, it } from 'vitest';
import { makeCliente } from '@/test/factories/cliente.factory';
import {
  clienteFormSchema,
  toClienteBody,
  toClienteForm,
  CLIENTE_FORM_VAZIO,
} from './cliente-form.schema';
import { clientesSearchSchema } from './clientes-search.schema';
import { cnpjValido, cpfValido, erroDoDocumento } from './documento';

describe('cpfValido', () => {
  it.each(['52998224725', '11144477735'])('aceita %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });

  it.each([
    ['dígito errado', '52998224724'],
    ['sequência repetida', '11111111111'],
    ['curto', '5299822472'],
    ['com máscara', '529.982.247-25'],
  ])('recusa %s', (_, cpf) => {
    expect(cpfValido(cpf)).toBe(false);
  });
});

describe('cnpjValido', () => {
  it.each(['11222333000181', '45723174000110'])('aceita %s', (cnpj) => {
    expect(cnpjValido(cnpj)).toBe(true);
  });

  it.each([
    ['dígito errado', '11222333000182'],
    ['sequência repetida', '00000000000000'],
    ['curto', '1122233300018'],
  ])('recusa %s', (_, cnpj) => {
    expect(cnpjValido(cnpj)).toBe(false);
  });
});

describe('erroDoDocumento', () => {
  it.each([
    ['52998224725', undefined],
    ['11222333000181', undefined],
    ['52998224724', 'CPF inválido'],
    ['11222333000182', 'CNPJ inválido'],
    ['529982247', 'Informe o CPF ou o CNPJ completo'],
    ['5299822472512', 'Informe o CPF ou o CNPJ completo'],
  ])('%s: %s', (documento, mensagem) => {
    expect(erroDoDocumento(documento)).toBe(mensagem);
  });
});

describe('clienteFormSchema', () => {
  function erros(values: Partial<typeof CLIENTE_FORM_VAZIO>) {
    const result = clienteFormSchema.safeParse({
      ...CLIENTE_FORM_VAZIO,
      nome: 'Cliente Teste',
      documento: '52998224725',
      ...values,
    });

    return Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [
        issue.path.join('.'),
        issue.message,
      ]),
    );
  }

  it('aceita só os obrigatórios', () => {
    expect(erros({})).toEqual({});
  });

  it('pede nome e documento', () => {
    expect(erros({ nome: '  ', documento: '' })).toEqual({
      nome: 'Informe o nome',
      documento: 'Informe o CPF ou o CNPJ',
    });
  });

  it('recusa CPF e CNPJ inválidos', () => {
    expect(erros({ documento: '52998224724' })).toEqual({
      documento: 'CPF inválido',
    });
    expect(erros({ documento: '11222333000182' })).toEqual({
      documento: 'CNPJ inválido',
    });
  });

  it('confere telefone, e-mail e os limites', () => {
    expect(
      erros({
        nome: 'a'.repeat(151),
        telefone: '459999',
        email: 'sem-arroba',
        observacoes: 'a'.repeat(10001),
      }),
    ).toEqual({
      nome: 'Use até 150 caracteres',
      telefone: 'Informe o telefone com DDD',
      email: 'Informe um e-mail válido',
      observacoes: 'Use até 10.000 caracteres',
    });
  });

  it('aceita telefone fixo e celular', () => {
    expect(erros({ telefone: '4532221111' })).toEqual({});
    expect(erros({ telefone: '45999998888' })).toEqual({});
  });
});

describe('toClienteBody e toClienteForm', () => {
  it('envia null nos opcionais vazios', () => {
    expect(
      toClienteBody({
        ...CLIENTE_FORM_VAZIO,
        nome: 'Cliente Teste',
        documento: '52998224725',
      }),
    ).toEqual({
      nome: 'Cliente Teste',
      documento: '52998224725',
      telefone: null,
      email: null,
      observacoes: null,
    });
  });

  it('leva o cadastro para o formulário, com texto vazio no lugar de null', () => {
    expect(
      toClienteForm(makeCliente({ telefone: '45999998888', email: null })),
    ).toEqual({
      nome: 'Cliente Teste',
      documento: '52998224725',
      telefone: '45999998888',
      email: '',
      observacoes: '',
    });
  });
});

describe('clientesSearchSchema', () => {
  it('guarda só a paginação, mesmo que a URL traga uma busca', () => {
    expect(clientesSearchSchema.parse({ page: '2', q: '52998224725' })).toEqual(
      { page: 2, pageSize: 20 },
    );
  });

  it('corrige valores inválidos', () => {
    expect(clientesSearchSchema.parse({ page: 'x', pageSize: '500' })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });
});
