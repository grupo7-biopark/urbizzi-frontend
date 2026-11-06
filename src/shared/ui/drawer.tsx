'use client';

import { cn } from './cn';
import { Modal, type ModalProps } from './dialog';

type DrawerProps = ModalProps & {
  side?: 'left' | 'right';
  tema?: 'dark';
};

export function Drawer({ side = 'right', ...props }: DrawerProps) {
  return (
    <Modal
      {...props}
      contentClassName={cn(
        'inset-y-0 w-[85%] max-w-sm',
        side === 'right'
          ? 'right-0 animate-gaveta-direita'
          : 'left-0 animate-gaveta-esquerda',
      )}
    />
  );
}
