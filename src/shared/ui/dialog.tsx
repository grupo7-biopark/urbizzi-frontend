'use client';

import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactElement, ReactNode } from 'react';
import { Button } from './button';
import { cn } from './cn';
import { IconFechar } from './icon';

export type ModalProps = {
  title: string;
  description?: string;
  trigger?: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  footer?: ReactNode;
  children?: ReactNode;
};

/** Base do Dialog e do Drawer: o Radix cuida do foco, do Esc e do `aria-modal`. */
export function Modal({
  title,
  description,
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  footer,
  children,
  contentClassName,
  tema,
}: ModalProps & {
  contentClassName: string;
  /** Força o tema do conteúdo, como na gaveta do menu, sempre escura. */
  tema?: 'dark';
}) {
  return (
    <RadixDialog.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      {trigger ? (
        <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>
      ) : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 animate-surgir bg-preto/60" />
        <RadixDialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          data-theme={tema}
          className={cn(
            'fixed z-50 flex flex-col gap-4 overflow-y-auto border border-border bg-surface-panel p-6 text-ink',
            contentClassName,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="pt-1.5 text-title">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close asChild>
              <Button
                variant="fantasma"
                size="icone"
                aria-label="Fechar"
                className="-mt-1 -mr-2"
              >
                <IconFechar className="size-4" />
              </Button>
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="text-ink-muted">
              {description}
            </RadixDialog.Description>
          ) : null}
          {children}
          {footer ? (
            <div className="mt-2 flex flex-wrap justify-end gap-2 *:grow sm:*:grow-0">
              {footer}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function Dialog({
  size = 'padrao',
  ...props
}: ModalProps & { size?: 'padrao' | 'amplo' }) {
  return (
    <Modal
      {...props}
      contentClassName={cn(
        'top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 animate-subir',
        size === 'amplo' ? 'max-w-5xl' : 'max-w-lg',
      )}
    />
  );
}

export const DialogClose = RadixDialog.Close;
