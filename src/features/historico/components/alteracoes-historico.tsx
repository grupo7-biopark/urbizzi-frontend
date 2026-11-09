import type { Historico } from '../api/historico.api';
import { formatArea, formatMoeda } from '@/shared/ui/masks';
import { formatDataHora } from '@/shared/ui/datas';

function valorDoCampo(campo: string, valor: unknown) {
  if (typeof valor === 'string') {
    if (campo === 'valor' && /^\d+(\.\d{1,2})?$/.test(valor))
      return formatMoeda(valor);
    if (campo === 'areaM2' && /^\d+(\.\d{1,2})?$/.test(valor))
      return formatArea(valor);
    if (
      (campo.startsWith('data') ||
        campo === 'createdAt' ||
        campo === 'updatedAt') &&
      /^\d{4}-\d{2}-\d{2}T/.test(valor)
    )
      return formatDataHora(valor);
    if (campo === 'status')
      return (
        (
          {
            DISPONIVEL: 'Disponível',
            RESERVADO: 'Reservado',
            VENDIDO: 'Vendido',
            BLOQUEADO: 'Bloqueado',
            ATIVA: 'Ativa',
            EXPIRADA: 'Expirada',
            CANCELADA: 'Cancelada',
            CONVERTIDA: 'Convertida em venda',
            EM_ANALISE: 'Em análise',
            APROVADA: 'Aprovada',
            REJEITADA: 'Rejeitada',
          } as Record<string, string>
        )[valor] ?? valor
      );
  }
  return valorLegivel(valor);
}

function valorLegivel(valor: unknown): string {
  if (valor === null || valor === undefined) return 'Não informado';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (Array.isArray(valor))
    return valor.map(valorLegivel).join(' · ') || 'Lista vazia';
  if (typeof valor === 'object')
    return (
      Object.entries(valor)
        .map(([k, v]) => `${campoLegivel(k)}: ${valorLegivel(v)}`)
        .join('; ') || 'Sem campos'
    );
  return String(valor);
}
function campoLegivel(campo: string) {
  const nomes: Record<string, string> = {
    areaM2: 'Área (m²)',
    valor: 'Valor',
    dataVencimento: 'Vencimento',
    exibirValorPublico: 'Exibir valor no mapa',
    status: 'Situação',
    numero: 'Número',
    nome: 'Nome',
    ativo: 'Ativo',
  };
  return (
    nomes[campo] ??
    campo.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')
  );
}
function campos(valor: Historico['valorNovo']): Record<string, unknown> {
  if (valor === null) return {};
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? valor
    : { Registro: valor };
}
export function AlteracoesHistorico({ registro }: { registro: Historico }) {
  const antes = campos(registro.valorAnterior),
    depois = campos(registro.valorNovo);
  const chaves = [
    ...new Set([...Object.keys(antes), ...Object.keys(depois)]),
  ].filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]));
  return (
    <div className="flex flex-col gap-4">
      {chaves.length ? (
        chaves.map((campo) => (
          <div key={campo} className="border border-border p-3">
            <h3 className="font-bold wrap-anywhere">{campoLegivel(campo)}</h3>
            <dl className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-ink-muted">Anterior</dt>
                <dd className="mt-1 whitespace-pre-wrap wrap-anywhere">
                  {valorDoCampo(campo, antes[campo])}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-ink-muted">Novo</dt>
                <dd className="mt-1 whitespace-pre-wrap wrap-anywhere">
                  {valorDoCampo(campo, depois[campo])}
                </dd>
              </div>
            </dl>
          </div>
        ))
      ) : (
        <p className="text-small text-ink-muted">
          Sem diferenças nos valores disponíveis.
        </p>
      )}
      {registro.motivo ? (
        <div>
          <h3 className="font-bold">Motivo</h3>
          <p className="mt-1 whitespace-pre-wrap wrap-anywhere">
            {registro.motivo}
          </p>
        </div>
      ) : null}
    </div>
  );
}
