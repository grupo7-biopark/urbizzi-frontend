import type { Acao } from '@/shared/auth/permissoes';

export type ItemMenu = { label: string; href: string; acao: Acao };

/** Toda página daqui confere a mesma `acao` com `exigirPermissao`. */
export const ITENS_MENU: ItemMenu[] = [
  { label: 'Início', href: '/', acao: 'verMapaLotesPainel' },
  { label: 'Mapa', href: '/mapa', acao: 'verMapaLotesPainel' },
  { label: 'Loteamentos', href: '/loteamentos', acao: 'verMapaLotesPainel' },
  { label: 'Lotes', href: '/lotes', acao: 'verMapaLotesPainel' },
  { label: 'Clientes', href: '/clientes', acao: 'verClientes' },
  { label: 'Reservas', href: '/reservas', acao: 'listarReservas' },
  { label: 'Propostas', href: '/propostas', acao: 'acompanharPropostas' },
  {
    label: 'Pendências',
    href: '/propostas/pendencias',
    acao: 'analisarPropostas',
  },
  {
    label: 'Links públicos',
    href: '/links-publicos',
    acao: 'gerarLinkPublico',
  },
  { label: 'Histórico', href: '/historico', acao: 'verHistorico' },
  { label: 'Usuários', href: '/usuarios', acao: 'gerenciarUsuarios' },
  {
    label: 'Configurações',
    href: '/configuracoes',
    acao: 'gerenciarConfiguracoes',
  },
];

function contemRota(href: string, pathname: string) {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** O item mais específico: em `/propostas/pendencias`, é Pendências, e não Propostas. */
export function getItemAtivo(pathname: string) {
  return ITENS_MENU.filter((item) => contemRota(item.href, pathname)).toSorted(
    (a, b) => b.href.length - a.href.length,
  )[0];
}
