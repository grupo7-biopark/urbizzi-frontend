'use client';

import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactElement, ReactNode } from 'react';
import { Button } from './button';
import { cn } from './cn';

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
}: ModalProps & { contentClassName: string }) {
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
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-preto/60" />
        <RadixDialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed z-50 flex flex-col gap-4 overflow-y-auto border border-ink bg-surface p-6 text-ink',
            contentClassName,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="text-heading">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close asChild>
              <Button variant="fantasma" aria-label="Fechar" className="px-3">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 12 12"
                  className="size-3 fill-none stroke-current stroke-2"
                >
                  <path d="M1 1l10 10M11 1 1 11" />
                </svg>
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
            <div className="flex flex-wrap justify-end gap-2">{footer}</div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function Dialog(props: ModalProps) {
  return (
    <Modal
      {...props}
      contentClassName="top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2"
    />
  );
}

export const DialogClose = RadixDialog.Close;
