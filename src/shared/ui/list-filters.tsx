'use client';

import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { buttonClasses } from './button';
import { IconBusca, IconFechar } from './icon';
import { Input } from './input';
import { Select } from './select';
import { hasActiveFilters, useListParams } from './use-list-params';

const SEARCH_DEBOUNCE_MS = 300;

type DebouncedSearchProps = {
  label?: string;
  value: string;
  onSearch: (value: string) => void;
};

/**
 * Busca com espera. É a base do filtro na URL e serve direto, com estado local,
 * nas buscas que aceitam dado pessoal, que não pode ir para a URL (clientes).
 */
export function DebouncedSearch({
  label = 'Buscar',
  value,
  onSearch,
}: DebouncedSearchProps) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Acompanha mudanças externas (voltar no navegador, limpar filtros), mas não
  // durante a digitação: a URL chega atrasada e apagaria o que foi digitado depois.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setText(value);
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;

    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next.trim()), SEARCH_DEBOUNCE_MS);
  }

  return (
    <Input
      ref={inputRef}
      label={label}
      type="search"
      icon={<IconBusca className="size-4" />}
      value={text}
      onChange={handleChange}
    />
  );
}

export function UrlSearchFilter({
  name = 'q',
  label,
}: {
  name?: string;
  label?: string;
}) {
  const { params, setParams } = useListParams();

  return (
    <DebouncedSearch
      label={label}
      value={params[name] ?? ''}
      onSearch={(value) => setParams({ [name]: value })}
    />
  );
}

type UrlSelectFilterProps = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  disabled?: boolean;
  /** Filtros que dependem deste e deixam de valer quando ele muda. */
  clears?: string[];
};

export function UrlSelectFilter({
  name,
  label,
  options,
  allLabel = 'Todos',
  disabled,
  clears = [],
}: UrlSelectFilterProps) {
  const { params, setParams } = useListParams();

  return (
    <Select
      label={label}
      value={params[name] ?? ''}
      disabled={disabled}
      onChange={(event) =>
        setParams({
          ...Object.fromEntries(clears.map((filtro) => [filtro, ''])),
          [name]: event.target.value,
        })
      }
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  const { params, pathname } = useListParams();

  return (
    <search
      aria-label="Filtros"
      className="grid gap-3 border border-border bg-surface-panel p-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end lg:*:[div]:w-72"
    >
      {children}
      {hasActiveFilters(params) ? (
        <Link href={pathname} className={buttonClasses('fantasma')}>
          <IconFechar className="size-4" />
          Limpar filtros
        </Link>
      ) : null}
    </search>
  );
}
