'use client';

import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/empty-state';
import { Form, FormInput } from '@/shared/ui/form';
import { Panel } from '@/shared/ui/panel';
import { Skeleton } from '@/shared/ui/skeleton';
import type { Prazos } from '../api/configuracoes.api';
import { prazosOptions } from '../api/configuracoes.queries';
import { useUpdatePrazos } from '../hooks/use-update-prazos';
import {
  configuracoesFormSchema,
  toConfiguracoesForm,
  type ConfiguracoesFormValues,
} from '../schemas/configuracoes-form.schema';

function FormularioDePrazos({ prazos }: { prazos: Prazos }) {
  const update = useUpdatePrazos();

  async function handleSubmit(values: ConfiguracoesFormValues) {
    await update.mutateAsync(values);
  }

  return (
    <Panel title="Prazos" className="max-w-2xl">
      <div className="flex flex-col gap-5">
        <p className="text-ink-muted">
          As mudanças valem para as próximas reservas e propostas. As que já
          existem continuam com o prazo de quando foram criadas.
        </p>
        <Form
          schema={configuracoesFormSchema}
          defaultValues={toConfiguracoesForm(prazos)}
          onSubmit={handleSubmit}
        >
          <FormInput
            name="prazoReservaDias"
            label="Prazo da reserva (dias)"
            inputMode="numeric"
            required
            hint="Por quantos dias corridos o lote fica reservado antes de expirar."
          />
          <FormInput
            name="prazoAnaliseDiasUteis"
            label="Prazo de análise da proposta (dias úteis)"
            inputMode="numeric"
            required
            hint="Quantos dias úteis o gestor tem para aprovar ou rejeitar uma proposta."
          />
        </Form>
      </div>
    </Panel>
  );
}

export function ConfiguracoesForm() {
  const query = useQuery(prazosOptions());

  if (query.isPending) {
    return (
      <Skeleton
        aria-label="Carregando as configurações"
        className="h-80 max-w-2xl"
      />
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        action={
          <Button variant="secundario" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return <FormularioDePrazos prazos={query.data} />;
}
