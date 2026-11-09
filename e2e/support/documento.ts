/**
 * CPF fictício com dígitos verificadores válidos, para não repetir entre
 * execuções: o backend real não remove clientes.
 */
export function gerarCpf() {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  // Nove dígitos iguais formam um CPF que a validação recusa.
  base[0] = (base[8] as number) === 9 ? 1 : 9;
  const digitos = [...base];

  for (const tamanho of [9, 10]) {
    const soma = digitos
      .slice(0, tamanho)
      .reduce(
        (total, digito, index) => total + digito * (tamanho + 1 - index),
        0,
      );
    digitos.push(((soma * 10) % 11) % 10);
  }

  return digitos.join('');
}

/** `52998224725` vira `529.982.247-25`. */
export function formatarCpf(cpf: string) {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
