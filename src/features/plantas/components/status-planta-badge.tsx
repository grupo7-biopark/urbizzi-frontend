import type { ComponentProps } from 'react';
import { Badge } from '@/shared/ui/badge';
import type { StatusPlanta } from '../api/plantas.api';

const STATUS_PLANTA: Record<
  StatusPlanta,
  { label: string; tone: ComponentProps<typeof Badge>['tone'] }
> = {
  ENVIADA: { label: 'Enviada', tone: 'neutro' },
  PROCESSANDO: { label: 'Processando', tone: 'reservado' },
  PRONTA: { label: 'Pronta', tone: 'disponivel' },
  ERRO: { label: 'Erro', tone: 'perigo' },
};

export function StatusPlantaBadge({ status }: { status: StatusPlanta }) {
  const { label, tone } = STATUS_PLANTA[status];

  return <Badge tone={tone}>{label}</Badge>;
}
