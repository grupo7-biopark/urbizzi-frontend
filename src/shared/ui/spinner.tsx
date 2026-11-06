import { cn } from './cn';

type SpinnerProps = {
  label?: string;
  className?: string;
};

export function Spinner({ label = 'Carregando', className }: SpinnerProps) {
  return (
    <output aria-label={label} className={cn('inline-flex', className)}>
      <span className="size-5 animate-spin border-2 border-current/25 border-t-current motion-reduce:animate-none" />
    </output>
  );
}
