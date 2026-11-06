import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './alert';
import { Button } from './button';
import { EmptyState, ErrorState } from './empty-state';
import { Panel } from './panel';

describe('Panel', () => {
  it('com título, é uma seção nomeada, com as ações ao lado', () => {
    render(
      <Panel title="Quadras" actions={<Button>Nova quadra</Button>}>
        Conteúdo
      </Panel>,
    );

    const secao = screen.getByRole('region', { name: 'Quadras' });

    expect(secao).toHaveTextContent('Conteúdo');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Quadras' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Nova quadra' }),
    ).toBeInTheDocument();
  });

  it('sem título, não cria seção nem cabeçalho', () => {
    render(<Panel className="max-w-2xl">Conteúdo</Panel>);

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Conteúdo').parentElement).toHaveClass('max-w-2xl');
  });
});

describe('Alert', () => {
  it('é anunciado, e o ícone não entra no texto', () => {
    render(<Alert>O lote não está mais disponível.</Alert>);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /^O lote não está mais disponível\.$/,
    );
  });
});

describe('ErrorState', () => {
  it('anuncia a mensagem e oferece como continuar', () => {
    render(
      <ErrorState
        message="Não foi possível carregar"
        action={<Button>Tentar novamente</Button>}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar',
    );
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('usa o ícone informado no lugar do padrão, sem moldura quando `bare`', () => {
    const { container } = render(
      <EmptyState
        bare
        title="Nada aqui"
        icon={<span data-testid="icone-proprio" />}
      />,
    );

    expect(screen.getByTestId('icone-proprio')).toBeInTheDocument();
    expect(container.firstChild).not.toHaveClass('border');
  });
});
