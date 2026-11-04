'use client';

import { Toast as RadixToast } from 'radix-ui';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from './cn';

type ToastVariant = 'sucesso' | 'erro' | 'info';

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  sucesso: 'border-status-disponivel',
  erro: 'border-danger',
  info: 'border-ink',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current;
    nextId.current += 1;
    setToasts((current) => [...current, { ...input, id }]);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider label="Notificação" swipeDirection="right">
        {children}
        {toasts.map(({ id, title, description, variant = 'info' }) => (
          <RadixToast.Root
            key={id}
            // Erro interrompe o leitor de tela; os demais aguardam a fala atual terminar.
            type={variant === 'erro' ? 'foreground' : 'background'}
            onOpenChange={(open) => {
              if (!open) {
                setToasts((current) =>
                  current.filter((item) => item.id !== id),
                );
              }
            }}
            className={cn(
              'flex items-start justify-between gap-4 border-2 bg-surface p-4 text-ink',
              VARIANT_CLASSES[variant],
            )}
          >
            <div className="flex flex-col gap-1">
              <RadixToast.Title className="text-small font-bold">
                {title}
              </RadixToast.Title>
              {description ? (
                <RadixToast.Description className="text-small text-ink-muted">
                  {description}
                </RadixToast.Description>
              ) : null}
            </div>
            <RadixToast.Close
              aria-label="Fechar notificação"
              className="cursor-pointer p-1"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 12 12"
                className="size-3 fill-none stroke-current stroke-2"
              >
                <path d="M1 1l10 10M11 1 1 11" />
              </svg>
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport
          label="Notificações ({hotkey})"
          className="fixed right-0 bottom-0 z-60 flex w-full max-w-sm flex-col gap-2 p-4 empty:p-0"
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);

  if (!toast) {
    throw new Error('useToast precisa estar dentro de um ToastProvider');
  }

  return toast;
}
