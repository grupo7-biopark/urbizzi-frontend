'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Alert } from '@/shared/ui/alert';
import { EditorAreaGeografica } from '@/shared/ui/editor-area-geografica';
import { buscarLocal } from '../api/geografia.api';
import { areaOptions } from '../api/geografia.queries';
export function DemarcacaoLoteamento({
  id,
  vertices,
  onChange,
}: {
  id?: string;
  vertices: number[][] | null | undefined;
  onChange: (v: number[][] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const area = useQuery(areaOptions(id, open));
  return (
    <div className="space-y-3">
      <Button
        variant="secundario"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Ocultar mapa' : 'Demarcar no mapa'}
      </Button>
      {open &&
        (id && area.isPending ? (
          <output>Carregando demarcação…</output>
        ) : area.isError ? (
          <Alert>
            Não foi possível carregar a demarcação.{' '}
            <Button variant="fantasma" onClick={() => void area.refetch()}>
              Tentar novamente
            </Button>
          </Alert>
        ) : (
          <EditorAreaGeografica
            vertices={
              vertices === undefined
                ? (area.data?.area?.vertices ?? null)
                : vertices
            }
            onChange={onChange}
            buscar={buscarLocal}
            enquadramento={id ?? 'novo'}
          />
        ))}
    </div>
  );
}
