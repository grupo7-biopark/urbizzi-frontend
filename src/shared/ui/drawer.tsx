'use client';

import { cn } from './cn';
import { Modal, type ModalProps } from './dialog';

const SIDE_CLASSES = {
  left: 'inset-y-0 left-0 w-[85%] max-w-sm animate-gaveta-esquerda',
  right: 'inset-y-0 right-0 w-[85%] max-w-sm animate-gaveta-direita',
  // Sobe de baixo no celular, onde o polegar alcança; à direita a partir de `lg`.
  bottom:
    'inset-x-0 bottom-0 max-h-[75dvh] animate-subir lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:max-h-none lg:w-96 lg:animate-gaveta-direita',
};

type DrawerProps = ModalProps & {
  side?: keyof typeof SIDE_CLASSES;
  tema?: 'dark';
};

export function Drawer({ side = 'right', ...props }: DrawerProps) {
  return <Modal {...props} contentClassName={cn(SIDE_CLASSES[side])} />;
}
