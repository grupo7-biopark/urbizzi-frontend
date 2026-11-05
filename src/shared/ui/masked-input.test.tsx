import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { MaskedInput, type MaskName } from './masked-input';

function Campo({ mask, inicial = '' }: { mask: MaskName; inicial?: string }) {
  const [value, setValue] = useState(inicial);

  return (
    <>
      <MaskedInput
        label="Campo"
        mask={mask}
        value={value}
        onChange={setValue}
      />
      <output>{value}</output>
    </>
  );
}

async function digitar(texto: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Campo'), texto);
  return user;
}

function exibido() {
  return screen.getByLabelText('Campo');
}

function bruto() {
  return screen.getByRole('status');
}

describe('MaskedInput', () => {
  it('mostra o CPF com máscara e guarda só os dígitos', async () => {
    render(<Campo mask="cpfCnpj" />);

    await digitar('52998224725');

    expect(exibido()).toHaveValue('529.982.247-25');
    expect(bruto()).toHaveTextContent('52998224725');
  });

  it('passa a CNPJ durante a digitação', async () => {
    render(<Campo mask="cpfCnpj" />);

    await digitar('11222333000181');

    expect(exibido()).toHaveValue('11.222.333/0001-81');
    expect(bruto()).toHaveTextContent('11222333000181');
  });

  it('mostra o telefone com máscara e guarda só os dígitos', async () => {
    render(<Campo mask="telefone" />);

    await digitar('45999998888');

    expect(exibido()).toHaveValue('(45) 99999-8888');
    expect(bruto()).toHaveTextContent('45999998888');
  });

  it('digita a moeda em centavos e guarda a string decimal', async () => {
    render(<Campo mask="moeda" />);

    await digitar('25000000');

    expect(exibido()).toHaveValue('R$ 250.000,00');
    expect(bruto()).toHaveTextContent('250000.00');
  });

  it('digita a área sem sufixo e guarda a string decimal', async () => {
    render(<Campo mask="area" />);

    await digitar('36000');

    expect(exibido()).toHaveValue('360,00');
    expect(bruto()).toHaveTextContent('360.00');
  });

  it.each<[MaskName, string, string]>([
    ['moeda', '1234', 'R$ 1,23'],
    ['area', '1234', '1,23'],
  ])('o Backspace apaga o último dígito: %s', async (mask, texto, esperado) => {
    render(<Campo mask={mask} />);

    const user = await digitar(texto);
    await user.keyboard('{Backspace}');

    expect(exibido()).toHaveValue(esperado);
  });

  it('apagar tudo deixa o campo vazio, e não R$ 0,00', async () => {
    render(<Campo mask="moeda" inicial="1.23" />);

    const user = userEvent.setup();
    await user.clear(exibido());

    expect(exibido()).toHaveValue('');
    expect(bruto()).toHaveTextContent('');
  });

  it('aceita valor nulo da API', () => {
    render(
      <MaskedInput
        label="Campo"
        mask="moeda"
        value={null}
        onChange={() => undefined}
      />,
    );

    expect(exibido()).toHaveValue('');
  });

  it('abre o teclado numérico no celular', () => {
    render(<Campo mask="telefone" />);

    expect(exibido()).toHaveAttribute('inputmode', 'numeric');
  });
});
