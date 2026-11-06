import type { Acao } from '@/shared/auth/permissoes';
import {
  IconClientes,
  IconConfiguracoes,
  IconHistorico,
  IconInicio,
  IconLink,
  IconLoteamentos,
  IconLotes,
  IconMapa,
  IconPendencias,
  IconPropostas,
  IconReservas,
  IconUsuarios,
  type IconComponent,
} from '@/shared/ui/icon';

export type GrupoMenu = 'Geral' | 'Cadastros' | 'Comercial' | 'Administração';

export const GRUPOS_MENU: GrupoMenu[] = [
  'Geral',
  'Cadastros',
  'Comercial',
  'Administração',
];

export type ItemMenu = {
  label: string;
  href: string;
  acao: Acao;
  grupo: GrupoMenu;
  icone: IconComponent;
  /** Frase do atalho na tela inicial. */
  descricao: string;
};

/** Toda página daqui confere a mesma `acao` com `exigirPermissao`. */
export const ITENS_MENU: ItemMenu[] = [
  {
    label: 'Início',
    href: '/',
    acao: 'verMapaLotesPainel',
    grupo: 'Geral',
    icone: IconInicio,
    descricao: 'Atalhos para as áreas do sistema.',
  },
  {
    label: 'Mapa',
    href: '/mapa',
    acao: 'verMapaLotesPainel',
    grupo: 'Geral',
    icone: IconMapa,
    descricao: 'Planta interativa com os lotes e seus status.',
  },
  {
    label: 'Loteamentos',
    href: '/loteamentos',
    acao: 'verMapaLotesPainel',
    grupo: 'Cadastros',
    icone: IconLoteamentos,
    descricao: 'Loteamentos e suas quadras.',
  },
  {
    label: 'Lotes',
    href: '/lotes',
    acao: 'verMapaLotesPainel',
    grupo: 'Cadastros',
    icone: IconLotes,
    descricao: 'Lotes, áreas, valores e disponibilidade.',
  },
  {
    label: 'Clientes',
    href: '/clientes',
    acao: 'verClientes',
    grupo: 'Cadastros',
    icone: IconClientes,
    descricao: 'Cadastro de clientes.',
  },
  {
    label: 'Reservas',
    href: '/reservas',
    acao: 'listarReservas',
    grupo: 'Comercial',
    icone: IconReservas,
    descricao: 'Reservas de lotes e seus prazos.',
  },
  {
    label: 'Propostas',
    href: '/propostas',
    acao: 'acompanharPropostas',
    grupo: 'Comercial',
    icone: IconPropostas,
    descricao: 'Acompanhamento das propostas.',
  },
  {
    label: 'Pendências',
    href: '/propostas/pendencias',
    acao: 'analisarPropostas',
    grupo: 'Comercial',
    icone: IconPendencias,
    descricao: 'Propostas que aguardam análise.',
  },
  {
    label: 'Links públicos',
    href: '/links-publicos',
    acao: 'gerarLinkPublico',
    grupo: 'Comercial',
    icone: IconLink,
    descricao: 'Links do mapa para compartilhar.',
  },
  {
    label: 'Histórico',
    href: '/historico',
    acao: 'verHistorico',
    grupo: 'Administração',
    icone: IconHistorico,
    descricao: 'Registro das alterações.',
  },
  {
    label: 'Usuários',
    href: '/usuarios',
    acao: 'gerenciarUsuarios',
    grupo: 'Administração',
    icone: IconUsuarios,
    descricao: 'Contas e perfis de acesso.',
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    acao: 'gerenciarConfiguracoes',
    grupo: 'Administração',
    icone: IconConfiguracoes,
    descricao: 'Parâmetros do sistema.',
  },
];

/** Mantém a ordem dos grupos e deixa de fora os que ficaram sem itens. */
export function agruparItens(itens: ItemMenu[]) {
  return GRUPOS_MENU.map((grupo) => ({
    grupo,
    itens: itens.filter((item) => item.grupo === grupo),
  })).filter(({ itens: doGrupo }) => doGrupo.length > 0);
}

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
