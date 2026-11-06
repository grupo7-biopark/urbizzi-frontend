import { cn } from '@/shared/ui/cn';
import type { AnaliseGrade } from '../schemas/grade-fatias';

/**
 * Mostra as posições, e não as imagens: decodificar fatias de dezenas de MB só
 * para gerar miniaturas ocuparia centenas de MB de memória no navegador.
 */
export function GradePreview({
  analise: { linhas, colunas, celulas },
}: {
  analise: AnaliseGrade;
}) {
  const presentes = celulas.filter(({ presente }) => presente).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-small text-ink-muted">
        Grade {linhas} x {colunas}: {presentes} de {celulas.length} fatias
      </p>
      <ul
        aria-label="Pré-visualização da grade"
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}
      >
        {celulas.map(({ linha, coluna, nome, presente }) => (
          <li
            key={nome}
            className={cn(
              'flex min-h-10 flex-col items-center justify-center border text-center text-caption wrap-anywhere',
              presente
                ? 'border-transparent bg-surface-hover text-ink'
                : 'border-danger text-danger',
            )}
          >
            <span className="sr-only">{nome}</span>
            <span aria-hidden="true">
              {linha}×{coluna}
            </span>
            {presente ? null : <span>Falta</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
