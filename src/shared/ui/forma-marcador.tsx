import { cn } from './cn';

/** Diferencia os marcadores além da cor, para quem não distingue as cores. */
export type FormaMarcador = 'circulo' | 'quadrado' | 'triangulo' | 'losango';

type Ponto = { x: number; y: number };

/** Vértices em volta do centro, com `raio` de distância; o círculo não tem vértices. */
export function getVerticesDaForma(
  forma: Exclude<FormaMarcador, 'circulo'>,
  { x, y }: Ponto,
  raio: number,
): Ponto[] {
  switch (forma) {
    case 'quadrado':
      return [
        { x: x - raio, y: y - raio },
        { x: x + raio, y: y - raio },
        { x: x + raio, y: y + raio },
        { x: x - raio, y: y + raio },
      ];
    case 'triangulo':
      return [
        { x, y: y - raio },
        { x: x + raio, y: y + raio },
        { x: x - raio, y: y + raio },
      ];
    case 'losango':
      return [
        { x, y: y - raio },
        { x: x + raio, y },
        { x, y: y + raio },
        { x: x - raio, y },
      ];
  }
}

/** A mesma forma do mapa, para a legenda. A cor é o nome de um token de cor. */
export function FormaMarcadorIcone({
  forma,
  cor,
  className,
}: {
  forma: FormaMarcador;
  cor: string;
  className?: string;
}) {
  const estilo = { fill: `var(${cor})` };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn('size-4 shrink-0 stroke-ink', className)}
    >
      {forma === 'circulo' ? (
        <circle cx="8" cy="8" r="6" style={estilo} />
      ) : (
        <polygon
          points={getVerticesDaForma(forma, { x: 8, y: 8 }, 6)
            .map(({ x, y }) => `${x},${y}`)
            .join(' ')}
          style={estilo}
        />
      )}
    </svg>
  );
}
