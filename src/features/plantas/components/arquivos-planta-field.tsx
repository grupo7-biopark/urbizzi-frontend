'use client';

import { useController } from 'react-hook-form';
import { Alert } from '@/shared/ui/alert';
import { Input } from '@/shared/ui/input';
import { analisarGrade } from '../schemas/grade-fatias';
import { GradePreview } from './grade-preview';

const TAMANHO = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

function formatarTamanho(bytes: number) {
  return `${TAMANHO.format(bytes / (1024 * 1024))} MB`;
}

export function ArquivosPlantaField() {
  const {
    field: { ref, name, onBlur, onChange, value },
    fieldState,
  } = useController({ name: 'arquivos' });
  const arquivos = value as File[];
  const analise = analisarGrade(arquivos);
  const total = arquivos.reduce((soma, { size }) => soma + size, 0);

  return (
    <div className="flex flex-col gap-3">
      <Input
        ref={ref}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(Array.from(event.target.files ?? []))}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        label="Arquivos"
        required
        hint="Uma imagem PNG ou JPEG, ou todas as fatias, com os nomes no padrão fatia_LL_CC (ex.: fatia_01_02.png). Até 300 MB por arquivo e 100 arquivos."
        error={fieldState.error?.message}
      />
      {arquivos.length > 0 ? (
        <p className="text-small text-ink-muted">
          {analise.imagemUnica ? `Imagem única: ${arquivos[0]?.name}. ` : null}
          {arquivos.length === 1 ? 'Tamanho' : 'Tamanho total'}:{' '}
          {formatarTamanho(total)}
        </p>
      ) : null}
      {analise.celulas.length > 0 ? <GradePreview analise={analise} /> : null}
      {analise.problemas.length > 0 ? (
        <Alert>
          <ul className="flex flex-col gap-1">
            {analise.problemas.map((problema) => (
              <li key={problema}>{problema}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}
