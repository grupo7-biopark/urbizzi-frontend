import type { ReactNode } from 'react';
import { cn } from './cn';
import { Logo } from './logo';

type StatusPageProps = {
  /** Código exibido em destaque, como 404. */
  code?: string;
  title: string;
  /** Anunciada a leitores de tela, para os erros que chegam sem navegação. */
  alert?: boolean;
  description: string;
  action: ReactNode;
  /** Fora do layout de `(app)`, a própria página traz o `main` e o logo. */
  standalone?: boolean;
};

/** Páginas 403, 404 e de erro. */
export function StatusPage({
  code,
  title,
  alert = false,
  description,
  action,
  standalone = false,
}: StatusPageProps) {
  const Container = standalone ? 'main' : 'div';

  return (
    <Container
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-4 text-center',
        standalone ? 'min-h-dvh' : 'min-h-96',
      )}
    >
      {standalone ? <Logo className="h-10 w-auto" /> : null}
      {code ? (
        <p className="font-display text-display text-accent">{code}</p>
      ) : null}
      <h1 className="text-heading">{title}</h1>
      <p {...(alert ? { role: 'alert' } : {})}>{description}</p>
      {action}
    </Container>
  );
}
