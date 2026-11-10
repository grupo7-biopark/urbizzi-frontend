'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWatch } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { Alert } from '@/shared/ui/alert';
import { EditorAreaGeografica } from '@/shared/ui/editor-area-geografica';
import { buscarLocal } from '../api/geografia.api';
import { areasOptions } from '../api/geografia.queries';

export function DemarcacaoNovoLote({
  onChange,
  vertices,
}: {
  onChange: (parent: string, v: number[][] | null) => void;
  vertices?: { parent: string; value: number[][] | null };
}) {
  const id = useWatch({ name: 'loteamentoId' }) as string;
  const quadraId = useWatch({ name: 'quadraId' }) as string;
  return (
    <DemarcacaoLote
      key={`${id}:${quadraId}`}
      loteamentoId={id}
      quadraId={quadraId}
      vertices={vertices?.parent === quadraId ? vertices.value : undefined}
      onChange={(v) => onChange(quadraId, v)}
    />
  );
}
export function DemarcacaoLote({
  id,
  loteamentoId,
  quadraId,
  vertices,
  onChange,
}: {
  id?: string;
  loteamentoId: string;
  quadraId: string;
  vertices: number[][] | null | undefined;
  onChange: (v: number[][] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const areas = useQuery(areasOptions(loteamentoId, open));
  const parent = areas.data?.find(
    (a) => a.id === quadraId && a.tipo === 'QUADRA',
  );
  return (
    <div className="space-y-3">
      <Button
        variant="secundario"
        disabled={!loteamentoId || !quadraId}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Ocultar mapa' : 'Demarcar no mapa'}
      </Button>
      {(!loteamentoId || !quadraId) && (
        <p className="text-small text-ink-muted">
          Selecione o loteamento e a quadra para demarcar o lote.
        </p>
      )}
      {open &&
        (areas.isPending ? (
          <output>Carregando limites do loteamento…</output>
        ) : areas.isError ? (
          <Alert>
            Não foi possível carregar os limites.{' '}
            <Button variant="fantasma" onClick={() => void areas.refetch()}>
              Tentar novamente
            </Button>
          </Alert>
        ) : !parent ? (
          <p className="text-small">
            Esta quadra ainda não tem uma área demarcada.{' '}
            <Link
              href={`/loteamentos/${loteamentoId}#quadras`}
              className="font-bold underline"
            >
              Demarque a quadra primeiro
            </Link>
            .
          </p>
        ) : (
          <EditorAreaGeografica
            vertices={
              vertices === undefined
                ? (areas.data?.find((a) => a.id === id)?.vertices ?? null)
                : vertices
            }
            onChange={onChange}
            buscar={buscarLocal}
            enquadramento={quadraId}
            contornos={(areas.data ?? [])
              .filter((a) => a.id !== id && a.quadraId === quadraId)
              .map((a) => ({
                id: a.id,
                vertices: a.vertices,
                label: a.nome,
                preenchido: a.tipo === 'LOTE',
                rotuloFixo: a.tipo === 'QUADRA',
                color:
                  a.tipo === 'QUADRA' ? 'var(--accent)' : 'var(--ink-muted)',
              }))}
          />
        ))}
    </div>
  );
}
