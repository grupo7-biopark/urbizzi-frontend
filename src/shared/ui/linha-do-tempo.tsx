import type { ReactNode } from 'react';
import { formatDataHora } from './datas';
export type ItemLinhaDoTempo = {
  id: string;
  data: string;
  titulo: string;
  autor?: string;
  detalhe?: ReactNode;
};
/** Apresentação reutilizável: quem consulta e autoriza os eventos é a funcionalidade. */
export function LinhaDoTempo({
  itens,
  vazio = 'Nenhuma alteração registrada.',
}: {
  itens: ItemLinhaDoTempo[];
  vazio?: string;
}) {
  if (!itens.length)
    return <p className="text-small text-ink-muted">{vazio}</p>;
  return (
    <ol className="divide-y divide-border" aria-label="Linha do tempo">
      {itens.map((item) => (
        <li
          key={item.id}
          className="group relative border-l border-border py-4 pl-5 first:pt-0 last:pb-0"
        >
          <span
            aria-hidden="true"
            className="absolute -left-1 top-5 size-2 bg-accent group-first:top-1"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-bold wrap-anywhere">{item.titulo}</p>
            <time dateTime={item.data} className="text-caption text-ink-muted">
              {formatDataHora(item.data)}
            </time>
          </div>
          {item.autor ? (
            <p className="mt-1 text-small text-ink-muted wrap-anywhere">
              {item.autor}
            </p>
          ) : null}
          {item.detalhe ? <div className="mt-3">{item.detalhe}</div> : null}
        </li>
      ))}
    </ol>
  );
}
