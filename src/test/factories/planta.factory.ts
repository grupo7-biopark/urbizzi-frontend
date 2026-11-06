import type { Planta } from '@/features/plantas/api/plantas.api';

export function makePlanta(overrides: Partial<Planta> = {}): Planta {
  return {
    id: '7a3e5b2c-8a52-4a8e-9d3f-2c7f1e5a9b10',
    nome: 'Masterplan Teste',
    versao: 1,
    status: 'ENVIADA',
    ativa: false,
    gradeLinhas: 1,
    gradeColunas: 1,
    larguraPx: null,
    alturaPx: null,
    maxZoom: null,
    tamanhoTile: null,
    mensagemErro: null,
    criadoPorId: '9c4d2e1f-8a52-4a8e-9d3f-2c7f1e5a9b10',
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
    ...overrides,
  };
}
