'use client';

import type { QueryKey } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError } from '@/shared/api/errors';
import { Permitido } from '@/shared/auth/permitido';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { formatDataHora } from '@/shared/ui/datas';
import { Form, FormMaskedInput, FormTextarea } from '@/shared/ui/form';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { createProposta } from '../api/propostas.api';
import {
  propostaFormSchema,
  toCreateProposta,
  type PropostaFormValues,
} from '../schemas/proposta-form.schema';

export function CriarProposta({
  reservaId,
  vendedorId,
  numeroLote,
  disponivel,
  invalidates,
  vencimentoReserva,
}: {
  reservaId: string;
  vendedorId: string;
  numeroLote: string;
  disponivel: boolean;
  invalidates: QueryKey[];
  vencimentoReserva: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [prazoEnviado, setPrazoEnviado] = useState<string>();
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const reservaValida = new Date(vencimentoReserva).getTime() > agora;
  const create = useApiMutation({
    mutationFn: createProposta,
    invalidates: [['propostas'], ['reservas'], ...invalidates],
    successMessage: 'Proposta enviada para análise',
    errorToast: false,
  });
  async function salvar(values: PropostaFormValues) {
    if (!disponivel || new Date(vencimentoReserva).getTime() <= Date.now())
      throw new ApiError({
        statusCode: 409,
        code: 'RESERVA_INDISPONIVEL',
        message:
          'A reserva não permite uma nova proposta. Atualize os dados antes de continuar.',
      });
    const criada = await create.mutateAsync({
      reservaId,
      body: toCreateProposta(values),
    });
    setPrazoEnviado(criada.prazoLimite);
    setAberto(false);
  }
  return (
    <Permitido acao="criarProposta" donoId={vendedorId}>
      {disponivel && reservaValida ? (
        <Button variant="secundario" onClick={() => setAberto(true)}>
          Criar proposta
        </Button>
      ) : null}
      {prazoEnviado ? (
        <output className="text-small block">
          Prazo limite de análise:{' '}
          <time dateTime={prazoEnviado}>{formatDataHora(prazoEnviado)}</time>.
        </output>
      ) : null}
      <Dialog
        title={`Criar proposta para o lote ${numeroLote}`}
        open={aberto}
        onOpenChange={(next) => {
          if (!create.isPending) setAberto(next);
        }}
      >
        <Form
          schema={propostaFormSchema}
          defaultValues={{ valor: '', condicoes: '', observacoes: '' }}
          onSubmit={salvar}
          submitLabel="Enviar proposta"
        >
          <FormMaskedInput
            name="valor"
            label="Valor proposto"
            mask="moeda"
            required
          />
          <FormTextarea
            name="condicoes"
            label="Condições de pagamento"
            required
            maxLength={10000}
          />
          <FormTextarea
            name="observacoes"
            label="Observações"
            maxLength={10000}
          />
        </Form>
        <Button
          variant="secundario"
          disabled={create.isPending}
          onClick={() => setAberto(false)}
        >
          Voltar
        </Button>
      </Dialog>
    </Permitido>
  );
}
