'use client';

import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { IconSucesso } from '@/shared/ui/icon';
import type { Planta } from '../api/plantas.api';
import { useAtivarPlanta } from '../hooks/use-ativar-planta';

export function AtivarPlantaButton({ planta }: { planta: Planta }) {
  const ativar = useAtivarPlanta();

  return (
    <ConfirmDialog
      title={`Ativar a versão ${planta.versao} da planta?`}
      description="Ela passa a ser exibida no mapa, e a planta ativa hoje fica no histórico."
      confirmLabel="Ativar planta"
      onConfirm={() => ativar.mutateAsync(planta.id)}
      trigger={
        <Button
          variant="fantasma"
          size="compacto"
          aria-label={`Ativar a versão ${planta.versao}`}
        >
          <IconSucesso className="size-4" />
          Ativar
        </Button>
      }
    />
  );
}
