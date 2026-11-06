import { describe, expect, it } from 'vitest';
import { makePlanta } from '@/test/factories/planta.factory';
import {
  getIntervaloAtualizacao,
  INTERVALO_ATUALIZACAO_MS,
} from './plantas.queries';

describe('getIntervaloAtualizacao', () => {
  it.each(['ENVIADA', 'PROCESSANDO'] as const)(
    'continua consultando com uma planta %s',
    (status) => {
      expect(
        getIntervaloAtualizacao([
          makePlanta({ status: 'PRONTA' }),
          makePlanta({ status }),
        ]),
      ).toBe(INTERVALO_ATUALIZACAO_MS);
    },
  );

  it('para quando todas terminaram, com sucesso ou erro', () => {
    expect(
      getIntervaloAtualizacao([
        makePlanta({ status: 'PRONTA' }),
        makePlanta({ status: 'ERRO' }),
      ]),
    ).toBe(false);
  });

  it('não consulta antes de haver dados', () => {
    expect(getIntervaloAtualizacao()).toBe(false);
  });
});
