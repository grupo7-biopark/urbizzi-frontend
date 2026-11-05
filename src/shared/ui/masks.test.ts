import { describe, expect, it } from 'vitest';
import {
  formatArea,
  formatDecimal,
  formatMoeda,
  maskCpfCnpj,
  maskTelefone,
  onlyDigits,
  parseDecimalInput,
} from './masks';

describe('onlyDigits', () => {
  it('remove tudo que não é dígito', () => {
    expect(onlyDigits('529.982.247-25')).toBe('52998224725');
    expect(onlyDigits('abc')).toBe('');
  });
});

describe('maskCpfCnpj', () => {
  it.each([
    ['', ''],
    ['5', '5'],
    ['529', '529'],
    ['5299', '529.9'],
    ['529982', '529.982'],
    ['5299822', '529.982.2'],
    ['529982247', '529.982.247'],
    ['5299822472', '529.982.247-2'],
    ['52998224725', '529.982.247-25'],
  ])('formata o CPF enquanto digita: %s', (value, expected) => {
    expect(maskCpfCnpj(value)).toBe(expected);
  });

  it.each([
    ['112223330', '112.223.330'],
    ['112223330001', '11.222.333/0001'],
    ['1122233300018', '11.222.333/0001-8'],
    ['11222333000181', '11.222.333/0001-81'],
  ])('passa a CNPJ acima de 11 dígitos: %s', (value, expected) => {
    expect(maskCpfCnpj(value)).toBe(expected);
  });

  it('refaz a máscara de um valor já formatado', () => {
    expect(maskCpfCnpj('529.982.247-25')).toBe('529.982.247-25');
  });

  it('ignora letras e dígitos a mais', () => {
    expect(maskCpfCnpj('a5b2c9')).toBe('529');
    expect(maskCpfCnpj('112223330001819999')).toBe('11.222.333/0001-81');
  });
});

describe('maskTelefone', () => {
  it.each([
    ['', ''],
    ['4', '(4'],
    ['45', '(45'],
    ['453', '(45) 3'],
    ['4533334', '(45) 3333-4'],
    ['4533334444', '(45) 3333-4444'],
    ['45999998888', '(45) 99999-8888'],
    ['459999988889999', '(45) 99999-8888'],
  ])('formata %s', (value, expected) => {
    expect(maskTelefone(value)).toBe(expected);
  });
});

describe('formatDecimal', () => {
  it.each([
    ['0.00', '0,00'],
    ['1.50', '1,50'],
    ['1.5', '1,50'],
    ['12', '12,00'],
    ['999.99', '999,99'],
    ['1000.00', '1.000,00'],
    ['250000.00', '250.000,00'],
    ['1234567.89', '1.234.567,89'],
  ])('formata %s', (value, expected) => {
    expect(formatDecimal(value)).toBe(expected);
  });

  it('não perde precisão em valores que não cabem em number', () => {
    expect(formatDecimal('90071992547409931.99')).toBe(
      '90.071.992.547.409.931,99',
    );
  });

  it.each([[null], [undefined], [''], ['abc'], ['1.234'], ['-1.00'], ['1,50']])(
    'devolve vazio para o que não é decimal: %s',
    (value) => {
      expect(formatDecimal(value)).toBe('');
    },
  );
});

describe('formatMoeda', () => {
  it('formata em reais', () => {
    expect(formatMoeda('250000.00')).toBe('R$ 250.000,00');
  });

  it.each([[null], [undefined], ['']])('fica vazio sem valor: %s', (value) => {
    expect(formatMoeda(value)).toBe('');
  });
});

describe('formatArea', () => {
  it('formata em metros quadrados', () => {
    expect(formatArea('1360.5')).toBe('1.360,50 m²');
  });

  it.each([[null], [undefined], ['']])('fica vazio sem valor: %s', (value) => {
    expect(formatArea(value)).toBe('');
  });
});

describe('parseDecimalInput', () => {
  it.each([
    ['1', '0.01'],
    ['12', '0.12'],
    ['123', '1.23'],
    ['R$ 1,234', '12.34'],
    ['250.000,00', '250000.00'],
  ])('lê %s como centavos', (value, expected) => {
    expect(parseDecimalInput(value)).toBe(expected);
  });

  it.each([[''], ['R$ '], ['0'], ['R$ 0,0'], ['abc']])(
    'fica vazio sem valor: "%s"',
    (value) => {
      expect(parseDecimalInput(value)).toBe('');
    },
  );

  it('limita o tamanho do valor', () => {
    expect(parseDecimalInput('123456789012345678')).toBe('123456789012.34');
  });
});
