import type { ComponentProps } from 'react';
import { Input } from './input';
import {
  formatDecimal,
  formatMoeda,
  maskCpfCnpj,
  maskTelefone,
  onlyDigits,
  parseDecimalInput,
} from './masks';

const MASKS = {
  cpfCnpj: { format: maskCpfCnpj, parse: onlyDigits },
  telefone: { format: maskTelefone, parse: onlyDigits },
  moeda: { format: formatMoeda, parse: parseDecimalInput },
  // Sem o sufixo "m²": com o cursor no fim, o Backspace apagaria o sufixo, e não
  // o último dígito. A unidade fica no rótulo do campo.
  area: { format: formatDecimal, parse: parseDecimalInput },
};

export type MaskName = keyof typeof MASKS;

type MaskedInputProps = Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'inputMode'
> & {
  mask: MaskName;
  /** Valor sem máscara, como a API espera: só dígitos ou string decimal. */
  value: string | null | undefined;
  onChange: (value: string) => void;
};

export function MaskedInput({
  mask,
  value,
  onChange,
  ...props
}: MaskedInputProps) {
  const { format, parse } = MASKS[mask];

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={format(value ?? '')}
      onChange={(event) => onChange(parse(event.target.value))}
    />
  );
}
