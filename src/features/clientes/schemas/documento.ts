const CPF_DIGITOS = 11;
const CNPJ_DIGITOS = 14;

/** Dígito verificador do CPF e do CNPJ: soma ponderada, módulo 11. */
function digitoVerificador(digitos: string, pesos: number[]) {
  const soma = pesos.reduce(
    (total, peso, index) => total + Number(digitos[index]) * peso,
    0,
  );
  const resto = soma % 11;

  return resto < 2 ? 0 : 11 - resto;
}

/** `00000000000` passa na conta, mas não é documento: a API também recusa. */
function repetido(digitos: string) {
  return /^(\d)\1+$/.test(digitos);
}

export function cpfValido(digitos: string) {
  if (!/^\d{11}$/.test(digitos) || repetido(digitos)) {
    return false;
  }

  const primeiro = digitoVerificador(digitos, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digitoVerificador(digitos, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digitos.endsWith(`${primeiro}${segundo}`);
}

export function cnpjValido(digitos: string) {
  if (!/^\d{14}$/.test(digitos) || repetido(digitos)) {
    return false;
  }

  const pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const primeiro = digitoVerificador(digitos, pesos.slice(1));
  const segundo = digitoVerificador(digitos, pesos);

  return digitos.endsWith(`${primeiro}${segundo}`);
}

/** Mensagem para o documento, ou `undefined` quando ele é válido. Recebe só dígitos. */
export function erroDoDocumento(digitos: string) {
  if (digitos.length === CPF_DIGITOS) {
    return cpfValido(digitos) ? undefined : 'CPF inválido';
  }
  if (digitos.length === CNPJ_DIGITOS) {
    return cnpjValido(digitos) ? undefined : 'CNPJ inválido';
  }

  return 'Informe o CPF ou o CNPJ completo';
}
