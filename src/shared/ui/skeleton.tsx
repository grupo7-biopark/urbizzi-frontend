import type { ComponentProps } from 'react';
import { cn } from './cn';

type SkeletonProps = ComponentProps<'output'> & {
  'aria-label': string;
};

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <output
      className={cn(
        'block h-6 w-full animate-pulse bg-surface-alt motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
