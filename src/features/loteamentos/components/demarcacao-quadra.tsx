'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Alert } from '@/shared/ui/alert';
import { EditorAreaGeografica } from '@/shared/ui/editor-area-geografica';
import { areasOptions } from '../api/geografia.queries';
import { buscarLocal } from '../api/geografia.api';
export function DemarcacaoQuadra({
  id,
  loteamentoId,
  vertices,
  onChange,
}: {
  id?: string;
  loteamentoId: string;
  vertices: number[][] | null | undefined;
  onChange: (v: number[][] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const areas = useQuery(areasOptions(loteamentoId, open));
  const parent = areas.data?.find((a) => a.id === loteamentoId);
  return (
    <div className="space-y-3">
      <Button
        variant="secundario"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Ocultar mapa da quadra' : 'Demarcar quadra no mapa'}
      </Button>
      {open &&
        (areas.isPending ? (
          <output>Carregando limites…</output>
        ) : areas.isError ? (
          <Alert>
            Não foi possível carregar os limites.{' '}
            <Button variant="fantasma" onClick={() => void areas.refetch()}>
              Tentar novamente
            </Button>
          </Alert>
        ) : !parent ? (
          <p>
            Demarque primeiro o limite do loteamento em{' '}
            <Link
              className="underline"
              href={`/loteamentos/${loteamentoId}/editar`}
            >
              Editar loteamento
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
            enquadramento={id ?? loteamentoId}
            contornos={(areas.data ?? [])
              .filter((a) => a.id !== id)
              .map((a) => ({
                id: a.id,
                vertices: a.vertices,
                label: a.nome,
                preenchido: a.tipo === 'LOTE',
                rotuloFixo: a.tipo === 'QUADRA',
                color:
                  a.tipo === 'LOTEAMENTO'
                    ? 'var(--preto)'
                    : a.tipo === 'QUADRA'
                      ? 'var(--accent)'
                      : 'var(--ink-muted)',
              }))}
          />
        ))}
    </div>
  );
}
