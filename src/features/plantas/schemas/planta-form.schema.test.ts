import { describe, expect, it } from 'vitest';
import { plantaFormSchema } from './planta-form.schema';

function makeFile(nome: string) {
  return new File(['conteudo'], nome, { type: 'image/png' });
}

const VALIDO = {
  nome: 'Masterplan 2026',
  arquivos: [makeFile('masterplan.png')],
  copiarMarcadores: false,
};

function getMensagens(valores: unknown) {
  const resultado = plantaFormSchema.safeParse(valores);

  return resultado.success
    ? []
    : resultado.error.issues.map(({ message }) => message);
}

describe('plantaFormSchema', () => {
  it('aceita os dados válidos e tira os espaços do nome', () => {
    expect(
      plantaFormSchema.parse({ ...VALIDO, nome: '  Masterplan 2026  ' }).nome,
    ).toBe('Masterplan 2026');
  });

  it('exige o nome', () => {
    expect(getMensagens({ ...VALIDO, nome: '   ' })).toEqual([
      'Informe o nome',
    ]);
  });

  it('limita o nome a 150 caracteres', () => {
    expect(getMensagens({ ...VALIDO, nome: 'a'.repeat(151) })).toEqual([
      'Use até 150 caracteres',
    ]);
  });

  it('exige ao menos um arquivo', () => {
    expect(getMensagens({ ...VALIDO, arquivos: [] })).toEqual([
      'Selecione a imagem da planta ou as fatias',
    ]);
  });

  it('não deixa enviar uma grade incompleta', () => {
    expect(
      getMensagens({
        ...VALIDO,
        arquivos: [makeFile('fatia_01_01.png'), makeFile('fatia_02_02.png')],
      }),
    ).toEqual(['Corrija os problemas dos arquivos antes de enviar']);
  });
});
