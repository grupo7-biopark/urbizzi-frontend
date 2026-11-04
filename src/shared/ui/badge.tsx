import type { ComponentProps } from 'react';
import { cn } from './cn';

const TONE_CLASSES = {
  disponivel: 'bg-status-disponivel text-on-status-disponivel',
  reservado: 'bg-status-reservado text-on-status-reservado',
  vendido: 'bg-status-vendido text-on-status-vendido',
  bloqueado: 'bg-status-bloqueado text-on-status-bloqueado',
  perigo: 'bg-danger text-on-danger',
  neutro: 'bg-surface-alt text-ink',
};

type BadgeProps = ComponentProps<'span'> & {
  tone?: keyof typeof TONE_CLASSES;
};

export function Badge({ tone = 'neutro', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-caption whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}

// Os dois tipos abaixo repetem os enums do backend até a FE-05 entregar o schema gerado.
export type StatusLote = 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO' | 'BLOQUEADO';
export type StatusProposta = 'EM_ANALISE' | 'APROVADA' | 'REJEITADA';

const STATUS_LOTE = {
  DISPONIVEL: { label: 'Disponível', tone: 'disponivel' },
  RESERVADO: { label: 'Reservado', tone: 'reservado' },
  VENDIDO: { label: 'Vendido', tone: 'vendido' },
  BLOQUEADO: { label: 'Bloqueado', tone: 'bloqueado' },
} as const satisfies Record<
  StatusLote,
  { label: string; tone: keyof typeof TONE_CLASSES }
>;

const STATUS_PROPOSTA = {
  EM_ANALISE: { label: 'Em análise', tone: 'neutro' },
  APROVADA: { label: 'Aprovada', tone: 'disponivel' },
  REJEITADA: { label: 'Rejeitada', tone: 'perigo' },
} as const satisfies Record<
  StatusProposta,
  { label: string; tone: keyof typeof TONE_CLASSES }
>;

export function StatusLoteBadge({ status }: { status: StatusLote }) {
  const { label, tone } = STATUS_LOTE[status];

  return <Badge tone={tone}>{label}</Badge>;
}

export function StatusPropostaBadge({ status }: { status: StatusProposta }) {
  const { label, tone } = STATUS_PROPOSTA[status];

  return <Badge tone={tone}>{label}</Badge>;
}
