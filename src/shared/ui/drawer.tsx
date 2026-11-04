'use client';

import { cn } from './cn';
import { Modal, type ModalProps } from './dialog';

type DrawerProps = ModalProps & {
  side?: 'left' | 'right';
};

export function Drawer({ side = 'right', ...props }: DrawerProps) {
  return (
    <Modal
      {...props}
      contentClassName={cn(
        'inset-y-0 w-full max-w-md',
        side === 'right' ? 'right-0' : 'left-0',
      )}
    />
  );
}
