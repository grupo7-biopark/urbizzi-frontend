import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setTestUrl } from '@/test/next-navigation';
import {
  DebouncedSearch,
  FilterBar,
  UrlSearchFilter,
  UrlSelectFilter,
} from './list-filters';

vi.mock('next/navigation', () => import('@/test/next-navigation'));

const STATUS = [
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'VENDIDO', label: 'Vendido' },
];

beforeEach(() => {
  setTestUrl('/lotes');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  // `fireEvent` porque o `user-event` trava com os timers falsos do Vitest.
  function digitar(texto: string) {
    const campo = screen.getByLabelText('Buscar');
    campo.focus();
    fireEvent.change(campo, { target: { value: texto } });
  }

  function esperar(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  }

  function setup() {
    const onSearch = vi.fn<(value: string) => void>();
    const view = render(<DebouncedSearch value="" onSearch={onSearch} />);
    return { onSearch, ...view };
  }

  it('espera parar de digitar e busca uma vez só, sem espaços nas pontas', () => {
    const { onSearch } = setup();

    digitar(' b');
    esperar(299);
    digitar(' bela ');
    esperar(299);
    expect(onSearch).not.toHaveBeenCalled();

    esperar(1);

    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('bela');
  });

  it('não busca depois de sair da tela', () => {
    const { onSearch, unmount } = setup();

    digitar('b');
    unmount();
    esperar(300);

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('não apaga o que está sendo digitado quando a URL chega atrasada', () => {
    const { onSearch, rerender } = setup();

    digitar('bela');
    rerender(<DebouncedSearch value="bel" onSearch={onSearch} />);

    expect(screen.getByLabelText('Buscar')).toHaveValue('bela');
  });

  it('acompanha uma mudança externa quando o campo não está em foco', () => {
    const onSearch = vi.fn<(value: string) => void>();
    const { rerender } = render(
      <DebouncedSearch value="bela" onSearch={onSearch} />,
    );

    rerender(<DebouncedSearch value="" onSearch={onSearch} />);

    expect(screen.getByLabelText('Buscar')).toHaveValue('');
  });
});

describe('UrlSearchFilter', () => {
  it('começa com o valor da URL', () => {
    setTestUrl('/lotes?q=bela');

    render(<UrlSearchFilter />);

    expect(screen.getByLabelText('Buscar')).toHaveValue('bela');
  });

  it('aceita outro nome de parâmetro e rótulo', async () => {
    const user = userEvent.setup();
    render(<UrlSearchFilter name="numero" label="Número" />);

    await user.type(screen.getByLabelText('Número'), '12');

    await vi.waitFor(() => expect(window.location.search).toBe('?numero=12'));
  });

  it('remove o parâmetro ao limpar a busca', async () => {
    setTestUrl('/lotes?q=bela&page=2');
    const user = userEvent.setup();
    render(<UrlSearchFilter />);

    await user.clear(screen.getByLabelText('Buscar'));

    await vi.waitFor(() => expect(window.location.search).toBe(''));
  });
});

describe('UrlSelectFilter', () => {
  it('muda a URL, mantém os outros filtros e volta à primeira página', async () => {
    setTestUrl('/lotes?q=bela&page=3');
    const user = userEvent.setup();
    render(<UrlSelectFilter name="status" label="Status" options={STATUS} />);

    await user.selectOptions(screen.getByLabelText('Status'), 'VENDIDO');

    expect(window.location.search).toBe('?q=bela&status=VENDIDO');
    expect(screen.getByLabelText('Status')).toHaveValue('VENDIDO');
  });

  it('volta a "Todos" removendo o filtro', async () => {
    setTestUrl('/lotes?status=VENDIDO');
    const user = userEvent.setup();
    render(<UrlSelectFilter name="status" label="Status" options={STATUS} />);

    await user.selectOptions(screen.getByLabelText('Status'), '');

    expect(window.location.search).toBe('');
  });
});

describe('FilterBar', () => {
  it('oferece limpar só quando há filtro ativo', () => {
    setTestUrl('/lotes?page=2&pageSize=50&orderBy=numero&order=asc');
    render(<FilterBar>campos</FilterBar>);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    act(() => setTestUrl('/lotes?status=VENDIDO&page=2'));

    expect(
      screen.getByRole('link', { name: 'Limpar filtros' }),
    ).toHaveAttribute('href', '/lotes');
  });
});
