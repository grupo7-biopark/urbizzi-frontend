import { describe, expect, it } from 'vitest';
import { podeExecutar, type Acao, type Perfil } from './permissoes';

const USUARIO_ID = '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const OUTRO_ID = '7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

// Escrita à mão a partir de docs/security.md, para o teste não repetir o mapa.
// Ordem das colunas: Administrador, Gestor, Comercial, Consulta.
type Regra = 'sim' | 'proprios' | 'nao';
const MATRIZ: Record<Acao, [Regra, Regra, Regra, Regra]> = {
  gerenciarUsuarios: ['sim', 'nao', 'nao', 'nao'],
  gerenciarConfiguracoes: ['sim', 'nao', 'nao', 'nao'],
  gerenciarCadastros: ['sim', 'sim', 'nao', 'nao'],
  gerenciarPlanta: ['sim', 'sim', 'nao', 'nao'],
  gerenciarClientes: ['sim', 'sim', 'sim', 'nao'],
  verClientes: ['sim', 'sim', 'sim', 'nao'],
  gerenciarReservas: ['sim', 'sim', 'proprios', 'nao'],
  listarReservas: ['sim', 'sim', 'sim', 'nao'],
  verTodasReservas: ['sim', 'sim', 'nao', 'nao'],
  criarProposta: ['sim', 'sim', 'proprios', 'nao'],
  acompanharPropostas: ['sim', 'sim', 'proprios', 'nao'],
  analisarPropostas: ['sim', 'sim', 'nao', 'nao'],
  marcarVendido: ['sim', 'sim', 'nao', 'nao'],
  bloquearLote: ['sim', 'sim', 'nao', 'nao'],
  gerarLinkPublico: ['sim', 'sim', 'sim', 'nao'],
  desativarLinkPublico: ['sim', 'sim', 'proprios', 'nao'],
  verMapaLotesPainel: ['sim', 'sim', 'sim', 'sim'],
  verHistorico: ['sim', 'sim', 'proprios', 'nao'],
};

const PERFIS: Perfil[] = ['ADMINISTRADOR', 'GESTOR', 'COMERCIAL', 'CONSULTA'];

const CASOS = (Object.entries(MATRIZ) as [Acao, Regra[]][]).flatMap(
  ([acao, regras]) =>
    PERFIS.map((perfil, coluna) => ({
      acao,
      perfil,
      regra: regras[coluna] as Regra,
    })),
);

describe('podeExecutar', () => {
  it.each(CASOS)(
    '$perfil em $acao: $regra',
    ({ acao, perfil, regra }: (typeof CASOS)[number]) => {
      const usuario = { id: USUARIO_ID, perfil };

      expect(podeExecutar(usuario, acao)).toBe(regra !== 'nao');
      expect(podeExecutar(usuario, acao, { donoId: USUARIO_ID })).toBe(
        regra !== 'nao',
      );
      expect(podeExecutar(usuario, acao, { donoId: OUTRO_ID })).toBe(
        regra === 'sim',
      );
    },
  );
});
