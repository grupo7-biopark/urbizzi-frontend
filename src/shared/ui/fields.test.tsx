import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, buttonClasses } from './button';
import { Checkbox } from './checkbox';
import { Input } from './input';
import { Select } from './select';
import { Switch } from './switch';
import { Textarea } from './textarea';

describe('Button', () => {
  it('não envia formulário por padrão', () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('não dispara clique quando desabilitado', async () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it.each([
    ['primario', 'bg-accent'],
    ['secundario', 'border-ink'],
    ['perigo', 'bg-danger'],
    ['fantasma', 'border-transparent'],
    ['perigoSutil', 'text-danger'],
  ] as const)('aplica a variante %s', (variant, classe) => {
    render(<Button variant={variant}>Ação</Button>);

    expect(screen.getByRole('button')).toHaveClass(classe);
  });

  it('em andamento, fica inativo e mantém o nome', async () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button loading onClick={onClick}>
        Salvar
      </Button>,
    );

    const botao = screen.getByRole('button', { name: 'Salvar' });

    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(botao);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('fora de andamento, não se anuncia como ocupado', () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  // `:enabled` nunca casa com `<a>`: o link com aparência de botão ficaria sem hover.
  it.each([
    'primario',
    'secundario',
    'perigo',
    'fantasma',
    'perigoSutil',
  ] as const)('a variante %s tem hover também em link', (variant) => {
    expect(buttonClasses(variant)).toContain('not-disabled:hover:');
    expect(buttonClasses(variant)).not.toContain('enabled:');
  });
});

describe('Input com ícone', () => {
  it('mostra o ícone e abre espaço para ele', () => {
    render(<Input label="Buscar" icon={<svg data-testid="lupa" />} />);

    expect(screen.getByTestId('lupa')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar')).toHaveClass('pl-10');
  });
});

describe.each([
  ['Input', Input, 'textbox'],
  ['Textarea', Textarea, 'textbox'],
] as const)('%s', (_nome, Campo, papel) => {
  it('liga rótulo, dica e erro ao campo', () => {
    render(<Campo label="Nome" hint="Como aparece" error="Informe o nome" />);

    const campo = screen.getByRole(papel, { name: 'Nome' });

    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('Como aparece Informe o nome');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome');
  });

  it('não marca como inválido sem erro', () => {
    render(<Campo label="Nome" required />);

    const campo = screen.getByRole(papel, { name: /Nome/ });

    expect(campo).not.toHaveAttribute('aria-invalid');
    expect(campo).toBeRequired();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('usa o id informado', () => {
    render(<Campo id="nome" label="Nome" />);

    expect(screen.getByLabelText('Nome')).toHaveAttribute('id', 'nome');
  });

  it('aceita digitação', async () => {
    render(<Campo label="Nome" />);

    await userEvent.type(screen.getByLabelText('Nome'), 'Bela Vista');

    expect(screen.getByLabelText('Nome')).toHaveValue('Bela Vista');
  });
});

describe('Select', () => {
  function renderSelect(error?: string) {
    render(
      <Select label="Status" hint="Filtra a lista" error={error} required>
        <option value="A">Disponível</option>
        <option value="B">Reservado</option>
      </Select>,
    );
  }

  it('troca a opção pelo teclado', async () => {
    renderSelect();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /Status/ }),
      'B',
    );

    expect(screen.getByRole('combobox')).toHaveValue('B');
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription(
      'Filtra a lista',
    );
  });

  it('mostra o erro no campo', () => {
    renderSelect('Escolha um status');

    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha um status');
  });
});

describe('Checkbox', () => {
  it('alterna pelo teclado', async () => {
    render(<Checkbox label="Exibir valor" />);

    screen.getByRole('checkbox', { name: 'Exibir valor' }).focus();
    await userEvent.keyboard(' ');

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('liga dica e erro', () => {
    render(
      <Checkbox label="Aceito" required hint="Obrigatório" error="Aceite" />,
    );

    const campo = screen.getByRole('checkbox', { name: /Aceito/ });

    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('Obrigatório Aceite');
  });
});

describe('Switch', () => {
  it('expõe o papel de switch e alterna pelo teclado', async () => {
    const onChange = vi.fn<() => void>();
    render(<Switch label="Ativo" onChange={onChange} />);

    const campo = screen.getByRole('switch', { name: 'Ativo' });

    campo.focus();
    await userEvent.keyboard(' ');

    expect(campo).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
  });
});
