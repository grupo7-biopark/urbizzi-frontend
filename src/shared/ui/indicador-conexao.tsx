import type { EstadoConexao } from '@/shared/api/use-event-source';
import { badgeClasses } from './badge';
import { cn } from './cn';

const ROTULOS: Record<EstadoConexao, string> = {
  conectando: 'Conectando…',
  'ao-vivo': 'Ao vivo',
  reconectando: 'Reconectando…',
};

/** Estado discreto do fluxo SSE, anunciado por leitores de tela. */
export function IndicadorConexao({
  estado,
  className,
}: {
  estado: EstadoConexao;
  className?: string;
}) {
  const aoVivo = estado === 'ao-vivo';

  return (
    <output
      className={badgeClasses(
        aoVivo ? 'disponivel' : 'neutro',
        cn('gap-1.5', className),
      )}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {ROTULOS[estado]}
    </output>
  );
}
