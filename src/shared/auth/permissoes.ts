import type { components } from '@/shared/api/schema';

type UsuarioLogado = components['schemas']['UsuarioLogadoDto'];

export type Perfil = UsuarioLogado['perfil'];

/** `proprios`: só nos registros do próprio usuário. A API confere de novo. */
type Alcance = 'todos' | 'proprios';

/**
 * Cópia da matriz de `docs/security.md` do backend, que é a fonte de verdade. Serve
 * para adaptar a tela: quem protege os dados é a API (RNF06). `ADMINISTRADOR` não é
 * coringa: um perfil fora da ação não pode executá-la.
 */
const PERMISSOES = {
  gerenciarUsuarios: { ADMINISTRADOR: 'todos' },
  gerenciarConfiguracoes: { ADMINISTRADOR: 'todos' },
  gerenciarCadastros: { ADMINISTRADOR: 'todos', GESTOR: 'todos' },
  gerenciarPlanta: { ADMINISTRADOR: 'todos', GESTOR: 'todos' },
  gerenciarClientes: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'todos',
  },
  verClientes: { ADMINISTRADOR: 'todos', GESTOR: 'todos', COMERCIAL: 'todos' },
  gerenciarReservas: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'proprios',
  },
  listarReservas: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'todos',
  },
  criarProposta: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'proprios',
  },
  acompanharPropostas: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'proprios',
  },
  analisarPropostas: { ADMINISTRADOR: 'todos', GESTOR: 'todos' },
  marcarVendido: { ADMINISTRADOR: 'todos', GESTOR: 'todos' },
  bloquearLote: { ADMINISTRADOR: 'todos', GESTOR: 'todos' },
  gerarLinkPublico: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'todos',
  },
  desativarLinkPublico: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'proprios',
  },
  verMapaLotesPainel: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'todos',
    CONSULTA: 'todos',
  },
  verHistorico: {
    ADMINISTRADOR: 'todos',
    GESTOR: 'todos',
    COMERCIAL: 'proprios',
  },
} as const satisfies Record<string, Partial<Record<Perfil, Alcance>>>;

export type Acao = keyof typeof PERMISSOES;

export type OpcoesPermissao = {
  /** Dono do registro. Sem ele, responde se o perfil pode agir em algum registro. */
  donoId?: string;
};

export function podeExecutar(
  usuario: Pick<UsuarioLogado, 'id' | 'perfil'>,
  acao: Acao,
  { donoId }: OpcoesPermissao = {},
) {
  const regras: Partial<Record<Perfil, Alcance>> = PERMISSOES[acao];
  const alcance = regras[usuario.perfil];

  if (alcance === 'proprios' && donoId !== undefined) {
    return donoId === usuario.id;
  }

  return alcance !== undefined;
}

export const ROTULOS_PERFIL: Record<Perfil, string> = {
  ADMINISTRADOR: 'Administrador',
  GESTOR: 'Gestor',
  COMERCIAL: 'Comercial',
  CONSULTA: 'Consulta',
};
