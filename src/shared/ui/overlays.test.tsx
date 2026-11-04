import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { Button } from './button';
import { Dialog, DialogClose } from './dialog';
import { Drawer } from './drawer';
import { Dropdown, DropdownItem, DropdownSeparator } from './dropdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { ToastProvider, useToast } from './toast';
import { Tooltip } from './tooltip';

describe.each([
  ['Dialog', Dialog],
  ['Drawer', Drawer],
] as const)('%s', (_nome, Modal) => {
  function renderModal() {
    render(
      <Modal
        title="Cancelar reserva"
        description="O lote volta a ficar disponível."
        trigger={<Button>Abrir</Button>}
        footer={
          <DialogClose asChild>
            <Button>Voltar</Button>
          </DialogClose>
        }
      >
        <input aria-label="Motivo" />
      </Modal>,
    );
  }

  it('abre com título e descrição acessíveis e foco dentro dele', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    const modal = screen.getByRole('dialog', { name: 'Cancelar reserva' });

    expect(modal).toHaveAccessibleDescription(
      'O lote volta a ficar disponível.',
    );
    expect(modal).toContainElement(document.activeElement as HTMLElement);
  });

  it('fecha com Esc e devolve o foco ao botão', async () => {
    renderModal();
    const abrir = screen.getByRole('button', { name: 'Abrir' });

    await userEvent.click(abrir);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });

  it('mantém o foco preso dentro dele com Tab', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const modal = screen.getByRole('dialog');

    for (let i = 0; i < 5; i += 1) {
      await userEvent.tab();
      expect(modal).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('fecha pelo botão Fechar e pelo rodapé', async () => {
    renderModal();
    const abrir = screen.getByRole('button', { name: 'Abrir' });

    await userEvent.click(abrir);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(abrir);
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('não tem violações de acessibilidade quando aberto', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    await expectNoA11yViolations();
  });
});

describe('Dialog controlado', () => {
  it('avisa ao fechar e funciona sem descrição nem botão de abrir', async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<Dialog open title="Aviso" onOpenChange={onOpenChange} />);

    expect(screen.getByRole('dialog', { name: 'Aviso' })).not.toHaveAttribute(
      'aria-describedby',
    );

    await userEvent.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Drawer', () => {
  it.each([
    ['right', 'right-0'],
    ['left', 'left-0'],
  ] as const)('abre do lado %s', (side, classe) => {
    render(<Drawer defaultOpen side={side} title="Filtros" />);

    expect(screen.getByRole('dialog')).toHaveClass(classe);
  });
});

describe('Dropdown', () => {
  function renderDropdown(onSelect = vi.fn<() => void>()) {
    render(
      <Dropdown trigger={<Button>Ações</Button>}>
        <DropdownItem onSelect={onSelect}>Editar</DropdownItem>
        <DropdownItem disabled>Duplicar</DropdownItem>
        <DropdownSeparator />
        <DropdownItem variant="perigo">Excluir</DropdownItem>
      </Dropdown>,
    );

    return onSelect;
  }

  it('navega e seleciona pelo teclado', async () => {
    const onSelect = renderDropdown();

    screen.getByRole('button', { name: 'Ações' }).focus();
    await userEvent.keyboard('{Enter}');

    const menu = screen.getByRole('menu');

    await waitFor(() =>
      expect(
        within(menu).getByRole('menuitem', { name: 'Editar' }),
      ).toHaveFocus(),
    );
    await userEvent.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('pula o item desabilitado e fecha com Esc', async () => {
    renderDropdown();
    const acoes = screen.getByRole('button', { name: 'Ações' });

    acoes.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(acoes).toHaveFocus();
  });

  it('não tem violações de acessibilidade quando aberto', async () => {
    renderDropdown();

    await userEvent.click(screen.getByRole('button', { name: 'Ações' }));

    await expectNoA11yViolations(screen.getByRole('menu'));
  });
});

describe('Tabs', () => {
  function renderTabs() {
    render(
      <Tabs defaultValue="dados">
        <TabsList aria-label="Seções">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="propostas">Propostas</TabsTrigger>
          <TabsTrigger value="historico" disabled>
            Histórico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dados">Conteúdo dos dados</TabsContent>
        <TabsContent value="propostas">Conteúdo das propostas</TabsContent>
      </Tabs>,
    );
  }

  it('troca de aba pelas setas e mostra só o painel ativo', async () => {
    renderTabs();

    screen.getByRole('tab', { name: 'Dados' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Propostas' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Conteúdo das propostas',
    );
    expect(screen.queryByText('Conteúdo dos dados')).not.toBeInTheDocument();
  });

  it('pula a aba desabilitada', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: 'Propostas' }));
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Dados' })).toHaveFocus();
  });

  it('não tem violações de acessibilidade', async () => {
    renderTabs();

    await expectNoA11yViolations();
  });
});

describe('Toast', () => {
  function Disparador() {
    const toast = useToast();

    return (
      <>
        <Button
          onClick={() =>
            toast({
              title: 'Reserva criada',
              description: 'Lote 12',
              variant: 'sucesso',
            })
          }
        >
          Sucesso
        </Button>
        <Button onClick={() => toast({ title: 'Falhou', variant: 'erro' })}>
          Erro
        </Button>
      </>
    );
  }

  function renderToast() {
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
  }

  it('mostra a notificação e fecha pelo botão', async () => {
    renderToast();

    await userEvent.click(screen.getByRole('button', { name: 'Sucesso' }));

    expect(screen.getAllByText('Reserva criada')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Lote 12')[0]).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Fechar notificação' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
  });

  it('empilha várias notificações', async () => {
    renderToast();

    await userEvent.click(screen.getByRole('button', { name: 'Sucesso' }));
    await userEvent.click(screen.getByRole('button', { name: 'Erro' }));

    expect(
      screen.getAllByRole('button', { name: 'Fechar notificação' }),
    ).toHaveLength(2);
  });

  it('exige o provider', () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Disparador />)).toThrow(/ToastProvider/);

    silencio.mockRestore();
  });

  it('não tem violações de acessibilidade com notificação aberta', async () => {
    renderToast();

    await userEvent.click(screen.getByRole('button', { name: 'Sucesso' }));

    await expectNoA11yViolations();
  });
});

describe('Tooltip', () => {
  it('aparece no foco pelo teclado e some com Esc', async () => {
    render(
      <Tooltip content="Mostra o histórico">
        <Button>Histórico</Button>
      </Tooltip>,
    );

    await userEvent.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Mostra o histórico',
    );

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );
  });
});
