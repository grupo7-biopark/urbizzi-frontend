import type { ComponentProps } from 'react';
import { cn } from './cn';

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <table
      className={cn('w-full border-collapse text-left text-small', className)}
      {...props}
    />
  );
}

export function TableHeader(props: ComponentProps<'thead'>) {
  return <thead {...props} />;
}

export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-b border-border', className)} {...props} />;
}

export function TableHead({
  className,
  scope = 'col',
  ...props
}: ComponentProps<'th'>) {
  return (
    <th
      scope={scope}
      className={cn('px-3 py-2 align-bottom font-bold', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-3 py-2 align-top', className)} {...props} />;
}
