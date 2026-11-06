import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './page-header';
import { StatusPage } from './status-page';

describe('PageHeader', () => {
  it('mostra o título e a trilha, com a tela atual sem link', () => {
    render(
      <PageHeader
        title="Pendências"
        parents={[
          { label: 'Início', href: '/' },
          { label: 'Propostas', href: '/propostas' },
        ]}
        actions={<button type="button">Atualizar</button>}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Pendências' }),
    ).toBeInTheDocument();
    const trilha = within(
      screen.getByRole('navigation', { name: 'Trilha de navegação' }),
    );
    expect(trilha.getByRole('link', { name: 'Propostas' })).toHaveAttribute(
      'href',
      '/propostas',
    );
    expect(trilha.getByText('Pendências')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(trilha.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeVisible();
  });

  it('sem telas acima, não mostra a trilha', () => {
    render(<PageHeader title="Início" />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

describe('StatusPage', () => {
  it('fora do layout interno, traz o main e o logo', () => {
    render(
      <StatusPage
        standalone
        code="404"
        title="Página não encontrada"
        description="Confira o endereço."
        action={<button type="button">Voltar ao início</button>}
      />,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByAltText('Urbizzi')).not.toHaveLength(0);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('dentro do layout interno, deixa o main e o logo para ele e anuncia o erro', () => {
    render(
      <StatusPage
        alert
        title="Não foi possível carregar esta página"
        description="Tente novamente em instantes."
        action={<button type="button">Tentar novamente</button>}
      />,
    );

    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Urbizzi')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tente novamente em instantes.',
    );
  });
});
