'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapaGeografico } from '@/shared/ui/mapa-geografico';
import { Select } from '@/shared/ui/select';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Alert } from '@/shared/ui/alert';
import { Panel } from '@/shared/ui/panel';
import { Permitido } from '@/shared/auth/permitido';
import { areasGeograficasOptions } from '../api/geografia.queries';
export function MapaGeograficoView() {
  const query = useQuery(areasGeograficasOptions());
  const [parent, setParent] = useState('');
  const [selected, setSelected] = useState('');
  if (query.isPending)
    return (
      <Panel>
        <output>Carregando áreas demarcadas…</output>
      </Panel>
    );
  if (query.isError)
    return (
      <Alert>
        Não foi possível carregar as áreas.{' '}
        <Button variant="fantasma" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </Alert>
    );
  const areas = query.data.filter((a) => !parent || a.loteamentoId === parent);
  const current = areas.find((a) => a.id === selected);
  const lotes = areas.filter((a) => a.tipo === 'LOTE');
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,360px)_1fr] lg:items-end">
        <Select
          label="Loteamento no mapa"
          value={parent}
          onChange={(e) => {
            setParent(e.target.value);
            setSelected('');
          }}
        >
          <option value="">Todos os loteamentos</option>
          {query.data
            .filter((a) => a.tipo === 'LOTEAMENTO')
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
        </Select>
        <p className="text-small text-ink-muted">
          {areas.filter((a) => a.tipo === 'LOTEAMENTO').length} loteamentos ·{' '}
          {areas.filter((a) => a.tipo === 'QUADRA').length} quadras ·{' '}
          {lotes.length} lotes demarcados. Clique em uma área para consultar.
        </p>
      </div>
      {!query.data.length && (
        <Panel title="Comece pelo loteamento">
          <p>
            Cadastre ou edite um loteamento e use “Demarcar no mapa”. Depois,
            demarque as quadras e os lotes dentro delas.
          </p>
          <Permitido acao="gerenciarCadastros">
            <Link
              className={buttonClasses('secundario', 'mt-4')}
              href="/loteamentos/novo"
            >
              Cadastrar loteamento
            </Link>
          </Permitido>
        </Panel>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_280px]">
        <MapaGeografico
          enquadramento={parent || 'todos'}
          contornos={areas.map((a) => ({
            id: a.id,
            vertices: a.vertices,
            label: `${a.nome}${a.status ? ' · ' + a.status : ''}`,
            color:
              a.tipo === 'LOTEAMENTO'
                ? 'var(--preto)'
                : a.tipo === 'QUADRA'
                  ? 'var(--accent)'
                  : `var(--status-${a.status?.toLowerCase() ?? 'disponivel'})`,
            preenchido: a.tipo === 'LOTE',
            rotuloFixo: a.tipo === 'QUADRA',
          }))}
          onSelect={setSelected}
        />
        <Panel title={current?.nome ?? 'Explore o terreno'}>
          <div className="mb-4">
            <Select
              label="Consultar área"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Selecione uma área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                  {a.status ? ` · ${a.status}` : ''}
                </option>
              ))}
            </Select>
          </div>
          {current ? (
            <div className="space-y-4">
              <p className="text-small">
                {current.tipo === 'LOTEAMENTO'
                  ? 'Limite do loteamento'
                  : current.tipo === 'QUADRA'
                    ? 'Limite da quadra'
                    : `Situação: ${current.status}`}
              </p>
              <p className="text-caption text-ink-muted">
                {current.vertices.length} vértices geográficos
              </p>
              <Link
                className={buttonClasses('primario', 'w-full')}
                href={
                  current.tipo === 'LOTE'
                    ? `/lotes/${current.id}`
                    : current.tipo === 'QUADRA'
                      ? `/loteamentos/${current.loteamentoId}#quadras`
                      : `/loteamentos/${current.id}`
                }
              >
                Ver detalhes
              </Link>
              <Permitido acao="gerenciarCadastros">
                <Link
                  className={buttonClasses('secundario', 'w-full')}
                  href={
                    current.tipo === 'LOTE'
                      ? `/lotes/${current.id}/editar`
                      : current.tipo === 'QUADRA'
                        ? `/loteamentos/${current.loteamentoId}#quadras`
                        : `/loteamentos/${current.id}/editar`
                  }
                >
                  Editar demarcação
                </Link>
              </Permitido>
            </div>
          ) : (
            <p className="text-small text-ink-muted">
              Selecione um lote para ver os detalhes e acessar as ações
              disponíveis para seu perfil.
            </p>
          )}
          <ul className="mt-6 space-y-2 border-t border-border pt-4 text-small">
            {[
              ['disponivel', 'Disponível'],
              ['reservado', 'Reservado'],
              ['vendido', 'Vendido'],
              ['bloqueado', 'Bloqueado'],
            ].map(([status, label]) => (
              <li key={status} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 border border-ink"
                  style={{ backgroundColor: `var(--status-${status})` }}
                />
                {label}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <p className="text-caption text-ink-muted">
        Mapa de ruas do OpenStreetMap. Os limites são cadastrados pela equipe e
        não substituem levantamento topográfico. A planta por imagem continua
        disponível.
      </p>
    </div>
  );
}
