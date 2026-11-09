'use client';

// Combobox da WAI-ARIA com `aria-activedescendant`: o teclado fica no campo, e as
// opções só recebem clique. `<datalist>` e `<select>` não permitem esse padrão.
// oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-to-interactive-role

import { useQuery } from '@tanstack/react-query';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/shared/ui/cn';
import { IconBusca } from '@/shared/ui/icon';
import {
  CONTROL_CLASSES,
  CONTROL_HEIGHT_CLASSES,
  FieldLayout,
  useFieldControl,
} from '@/shared/ui/label';
import type { ClienteResumo } from '../api/clientes.api';
import { clientesListOptions } from '../api/clientes.queries';

const ESPERA_MS = 300;
const RESULTADOS = 8;
const CADASTRAR = 'cadastrar' as const;

type BuscaClienteProps = {
  value: ClienteResumo | null;
  onChange: (cliente: ClienteResumo | null) => void;
  /** Mostra a opção "Cadastrar novo cliente" no fim da lista. */
  onCadastrarNovo?: () => void;
  label?: string;
  error?: string;
  required?: boolean;
  /** Em um modal com rolagem, mantém as opções dentro da área visível. */
  listaNoFluxo?: boolean;
};

/**
 * Combobox para escolher um cliente por nome ou CPF/CNPJ, no padrão da WAI-ARIA:
 * setas percorrem as opções, Enter escolhe e Esc fecha. A busca fica só na
 * memória, nunca na URL. Telas de outras funcionalidades (reserva) o recebem
 * pela página, que compõe as duas (docs/architecture.md).
 */
export function BuscaCliente({
  value,
  onChange,
  onCadastrarNovo,
  label = 'Cliente',
  error,
  required,
  listaNoFluxo = false,
}: BuscaClienteProps) {
  const [texto, setTexto] = useState(value?.nome ?? '');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listboxId = useId();
  const { controlProps, hintId, errorId } = useFieldControl({
    label,
    error,
    required,
  });

  const query = useQuery({
    ...clientesListOptions({ page: 1, pageSize: RESULTADOS, q: busca }),
    enabled: aberto && busca.length > 0,
  });
  const clientes = busca && query.data ? query.data.data : [];
  const opcoes: (ClienteResumo | typeof CADASTRAR)[] = [
    ...clientes,
    ...(onCadastrarNovo ? [CADASTRAR] : []),
  ];

  // O último valor que o próprio campo avisou, para separar de uma mudança de fora.
  const avisado = useRef(value);

  function avisar(cliente: ClienteResumo | null) {
    avisado.current = cliente;
    onChange(cliente);
  }

  // Uma escolha feita fora (formulário limpo, cliente recém-cadastrado) aparece no
  // campo. A que o campo acabou de avisar, não: apagaria o que está sendo digitado.
  useEffect(() => {
    if (value?.id !== avisado.current?.id) {
      avisado.current = value;
      setTexto(value?.nome ?? '');
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function escolher(opcao: ClienteResumo | typeof CADASTRAR) {
    setAberto(false);
    setAtivo(-1);
    if (opcao === CADASTRAR) {
      onCadastrarNovo?.();
      return;
    }
    setTexto(opcao.nome);
    avisar(opcao);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const proximo = event.target.value;

    setTexto(proximo);
    setAberto(true);
    setAtivo(-1);
    // O texto mudou: a escolha anterior deixa de valer.
    if (value) {
      avisar(null);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBusca(proximo.trim()), ESPERA_MS);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setAberto(true);
      if (opcoes.length > 0) {
        const passo = event.key === 'ArrowDown' ? 1 : -1;
        // Sem opção ativa, a seta para cima vai à última, e não à penúltima.
        setAtivo((atual) =>
          atual < 0 && passo < 0
            ? opcoes.length - 1
            : (atual + passo + opcoes.length) % opcoes.length,
        );
      }
    } else if (event.key === 'Enter' && aberto && opcoes[ativo]) {
      event.preventDefault();
      escolher(opcoes[ativo]);
    } else if (event.key === 'Escape' && aberto) {
      event.preventDefault();
      setAberto(false);
      setAtivo(-1);
    }
  }

  const idDaOpcao = (index: number) => `${listboxId}-opcao-${index}`;
  const situacao = !busca
    ? 'Digite o nome ou o CPF/CNPJ'
    : query.isError
      ? 'Não foi possível buscar os clientes'
      : query.isPending || query.isPlaceholderData
        ? 'Buscando…'
        : clientes.length === 0
          ? 'Nenhum cliente encontrado'
          : null;

  return (
    <FieldLayout
      label={label}
      error={error}
      required={required}
      controlId={controlProps.id}
      hintId={hintId}
      errorId={errorId}
    >
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted">
          <IconBusca className="size-4" />
        </span>
        <input
          {...controlProps}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={aberto}
          aria-controls={listboxId}
          aria-activedescendant={ativo >= 0 ? idDaOpcao(ativo) : undefined}
          value={texto}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setAberto(true)}
          onBlur={() => {
            setAberto(false);
            setAtivo(-1);
          }}
          className={cn(CONTROL_CLASSES, CONTROL_HEIGHT_CLASSES, 'pl-10')}
        />
        <div
          hidden={!aberto}
          className={cn(
            'border border-ink bg-surface-panel py-1 text-ink',
            listaNoFluxo
              ? 'mt-1 max-h-48 overflow-y-auto'
              : 'absolute inset-x-0 top-full z-40',
          )}
        >
          {situacao ? (
            <p role="status" className="px-3 py-2 text-small text-ink-muted">
              {situacao}
            </p>
          ) : null}
          <ul id={listboxId} role="listbox" aria-label={label}>
            {opcoes.map((opcao, index) => (
              <li
                key={opcao === CADASTRAR ? CADASTRAR : opcao.id}
                id={idDaOpcao(index)}
                role="option"
                aria-selected={index === ativo}
                // Sem isso, o clique tira o foco do campo e fecha a lista antes de escolher.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => escolher(opcao)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-small',
                  index === ativo
                    ? 'bg-ink text-surface'
                    : 'hover:bg-surface-hover',
                  opcao === CADASTRAR && 'border-t border-border font-bold',
                )}
              >
                {opcao === CADASTRAR ? 'Cadastrar novo cliente' : opcao.nome}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FieldLayout>
  );
}
