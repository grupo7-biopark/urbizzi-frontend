import { describe, expect, it } from 'vitest';
import { loginFormSchema } from './login-form.schema';

function firstMessage(input: unknown) {
  const result = loginFormSchema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('loginFormSchema', () => {
  it('aceita credenciais válidas, sem espaços no e-mail', () => {
    expect(
      loginFormSchema.parse({ email: ' pessoa@exemplo.com ', senha: ' s ' }),
    ).toEqual({ email: 'pessoa@exemplo.com', senha: ' s ' });
  });

  it('exige o e-mail', () => {
    expect(firstMessage({ email: '  ', senha: 'x' })).toBe('Informe o e-mail');
  });

  it('recusa e-mail inválido', () => {
    expect(firstMessage({ email: 'pessoa', senha: 'x' })).toBe(
      'Informe um e-mail válido',
    );
  });

  it('exige a senha', () => {
    expect(firstMessage({ email: 'pessoa@exemplo.com', senha: '' })).toBe(
      'Informe a senha',
    );
  });
});
