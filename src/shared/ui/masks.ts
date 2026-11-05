const CPF_DIGITS = 11;
const CNPJ_DIGITS = 14;
const PHONE_DIGITS = 11;
// Evita que um valor colado passe do que a API aceita e fique sem sentido na tela.
const MAX_DECIMAL_DIGITS = 14;

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

/** Aplica o padrão só até onde há dígitos, para funcionar durante a digitação. */
function applyPattern(digits: string, pattern: string) {
  let index = 0;
  let result = '';

  for (const char of pattern) {
    if (index >= digits.length) {
      break;
    }
    if (char === '#') {
      result += digits[index];
      index += 1;
    } else {
      result += char;
    }
  }

  return result;
}

export function maskCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, CNPJ_DIGITS);

  return digits.length <= CPF_DIGITS
    ? applyPattern(digits, '###.###.###-##')
    : applyPattern(digits, '##.###.###/####-##');
}

export function maskTelefone(value: string) {
  const digits = onlyDigits(value).slice(0, PHONE_DIGITS);

  return digits.length < PHONE_DIGITS
    ? applyPattern(digits, '(##) ####-####')
    : applyPattern(digits, '(##) #####-####');
}

/**
 * Valores trafegam como string decimal (`"250000.00"`) e nunca passam por
 * `number`, para não perder precisão (docs/api-integration.md).
 */
export function formatDecimal(value: string | null | undefined) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value ?? '');

  if (!match) {
    return '';
  }

  const [, integer = '', fraction = ''] = match;
  const grouped = integer.replace(/\B(?=(\d{3})+$)/g, '.');

  return `${grouped},${fraction.padEnd(2, '0')}`;
}

export function formatMoeda(value: string | null | undefined) {
  const decimal = formatDecimal(value);

  return decimal && `R$ ${decimal}`;
}

export function formatArea(value: string | null | undefined) {
  const decimal = formatDecimal(value);

  return decimal && `${decimal} m²`;
}

/**
 * Lê o que foi digitado como centavos, da direita para a esquerda, como em caixa
 * eletrônico: `1`, `12`, `123` viram `0.01`, `0.12`, `1.23`. Sem valor, devolve
 * texto vazio, e não `0.00`, para o campo poder ficar em branco.
 */
export function parseDecimalInput(value: string) {
  const digits = onlyDigits(value)
    .replace(/^0+/, '')
    .slice(0, MAX_DECIMAL_DIGITS);

  if (!digits) {
    return '';
  }

  const padded = digits.padStart(3, '0');

  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}
