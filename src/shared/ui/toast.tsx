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
import {
  IconAlerta,
  IconFechar,
  IconInfo,
  IconSucesso,
  type IconComponent,
} from './icon';

type ToastVariant = 'sucesso' | 'erro' | 'info';

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const VARIANTES: Record<
  ToastVariant,
  { icone: IconComponent; borda: string; cor: string }
> = {
  sucesso: {
    icone: IconSucesso,
    borda: 'border-l-status-disponivel',
    cor: 'text-status-disponivel',
  },
  erro: { icone: IconAlerta, borda: 'border-l-danger', cor: 'text-danger' },
  info: { icone: IconInfo, borda: 'border-l-ink', cor: 'text-ink' },
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
        {toasts.map(({ id, title, description, variant = 'info' }) => {
          const { icone: Icone, borda, cor } = VARIANTES[variant];

          return (
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
                'flex animate-subir items-start gap-3 border border-l-4 border-border bg-surface-panel p-4 text-ink',
                borda,
              )}
            >
              <Icone className={cor} />
              <div className="flex min-w-0 grow flex-col gap-1">
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
                className="-m-1 flex size-7 shrink-0 cursor-pointer items-center justify-center transition-colors duration-150 hover:bg-surface-hover"
              >
                <IconFechar className="size-4" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
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
