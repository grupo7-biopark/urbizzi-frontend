import type { ComponentProps } from 'react';
import { cn } from './cn';

type ProgressBarProps = Omit<ComponentProps<'progress'>, 'value' | 'max'> & {
  'aria-label': string;
  /** Fração concluída, de 0 a 1. */
  value: number;
};

export function ProgressBar({ className, value, ...props }: ProgressBarProps) {
  return (
    <progress
      max={1}
      value={value}
      className={cn(
        'h-3 w-full appearance-none border border-ink-muted bg-surface',
        '[&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-surface [&::-webkit-progress-value]:bg-accent',
        className,
      )}
      {...props}
    />
  );
}
