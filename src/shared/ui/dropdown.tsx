'use client';

import { DropdownMenu } from 'radix-ui';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { cn } from './cn';

type DropdownProps = {
  trigger: ReactElement;
  align?: 'start' | 'center' | 'end';
  children: ReactNode;
};

export function Dropdown({
  trigger,
  align = 'start',
  children,
}: DropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className="z-50 min-w-40 border border-ink bg-surface py-1 text-ink"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type DropdownItemProps = ComponentProps<typeof DropdownMenu.Item> & {
  variant?: 'padrao' | 'perigo';
};

export function DropdownItem({
  variant = 'padrao',
  className,
  ...props
}: DropdownItemProps) {
  return (
    <DropdownMenu.Item
      className={cn(
        'cursor-pointer px-3 py-2 text-small outline-none data-disabled:cursor-not-allowed data-disabled:opacity-50',
        // `danger` não atinge 4,5:1 sobre surface-alt, então o destaque inverte as cores.
        variant === 'perigo'
          ? 'text-danger data-highlighted:bg-danger data-highlighted:text-on-danger'
          : 'data-highlighted:bg-ink data-highlighted:text-surface',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-border" />;
}
