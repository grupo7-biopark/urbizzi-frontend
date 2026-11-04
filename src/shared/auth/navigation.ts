/**
 * Navegação completa, usada ao entrar e ao sair: descarta o cache do TanStack
 * Query e do roteador, para os dados de um usuário não aparecerem para o próximo.
 */
export function navigateTo(path: string) {
  window.location.assign(path);
}
