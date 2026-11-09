import { z } from 'zod';
import type { Cliente } from '../api/clientes.api';
import { erroDoDocumento } from './documento';

// Os limites repetem os do backend para dar resposta imediata; quem decide é a API.
// Documento e telefone chegam aqui só com dígitos: a máscara fica no campo.
export const clienteFormSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Informe o nome')
    .max(150, 'Use até 150 caracteres'),
  documento: z
    .string()
    .min(1, 'Informe o CPF ou o CNPJ')
    .superRefine((digitos, ctx) => {
      // Vazio já tem a mensagem do `min`.
      const message = digitos && erroDoDocumento(digitos);

      if (message) {
        ctx.addIssue({ code: 'custom', message });
      }
    }),
  telefone: z
    .string()
    .refine(
      (digitos) => digitos === '' || digitos.length >= 10,
      'Informe o telefone com DDD',
    ),
  email: z
    .string()
    .trim()
    .max(254, 'Use até 254 caracteres')
    .refine(
      (email) => email === '' || z.email().safeParse(email).success,
      'Informe um e-mail válido',
    ),
  observacoes: z.string().trim().max(10000, 'Use até 10.000 caracteres'),
});

export type ClienteFormInput = z.input<typeof clienteFormSchema>;
export type ClienteFormValues = z.output<typeof clienteFormSchema>;

export const CLIENTE_FORM_VAZIO: ClienteFormInput = {
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  observacoes: '',
};

export function toClienteForm(cliente: Cliente): ClienteFormInput {
  return {
    nome: cliente.nome,
    documento: cliente.documento,
    telefone: cliente.telefone ?? '',
    email: cliente.email ?? '',
    observacoes: cliente.observacoes ?? '',
  };
}

/** Na API, campo opcional sem valor é `null`, o que também limpa o campo na edição. */
export function toClienteBody(values: ClienteFormValues) {
  return {
    nome: values.nome,
    documento: values.documento,
    telefone: values.telefone || null,
    email: values.email || null,
    observacoes: values.observacoes || null,
  };
}
