'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Permitido } from '@/shared/auth/permitido';
import { Button, buttonClasses } from '@/shared/ui/button';
import { EmptyState, ErrorState } from '@/shared/ui/empty-state';
import { IconMapa } from '@/shared/ui/icon';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  ALTURA_VISUALIZADOR,
  VisualizadorPlanta,
} from '@/shared/ui/visualizador-planta';
import { toPlantaVisualizada } from '../api/mapa.api';
import { plantaAtivaOptions } from '../api/mapa.queries';

function SemPlantaAtiva() {
  return (
    <EmptyState
      icon={<IconMapa />}
      title="Nenhuma planta ativa"
      description="O mapa aparece aqui quando uma versão da planta for ativada."
      action={
        <Permitido acao="gerenciarPlanta">
          <Link href="/plantas" className={buttonClasses('primario')}>
            Ir para as plantas
          </Link>
        </Permitido>
      }
    />
  );
}

export function PlantaAtivaVisualizador() {
  const query = useQuery(plantaAtivaOptions());

  if (query.isPending) {
    return (
      <Skeleton
        aria-label="Carregando a planta"
        className={ALTURA_VISUALIZADOR}
      />
    );
  }

  if (query.isError) {
    return query.error instanceof ApiError &&
      query.error.code === 'PLANTA_ATIVA_NAO_ENCONTRADA' ? (
      <SemPlantaAtiva />
    ) : (
      <ErrorState
        message={getErrorMessage(query.error)}
        action={
          <Button variant="secundario" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const planta = toPlantaVisualizada(query.data);

  return planta ? <VisualizadorPlanta planta={planta} /> : <SemPlantaAtiva />;
}
