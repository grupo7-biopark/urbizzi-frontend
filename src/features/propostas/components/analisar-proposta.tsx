'use client';

import { useQuery, type QueryKey } from '@tanstack/react-query';
import Link from 'next/link';
import { getErrorMessage } from '@/shared/api/errors';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { StatusLoteBadge } from '@/shared/ui/badge';
import { Dialog } from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/empty-state';
import { Form, FormSelect, FormTextarea } from '@/shared/ui/form';
import { formatDataHora } from '@/shared/ui/datas';
import { formatMoeda, formatArea } from '@/shared/ui/masks';
import { useApiMutation } from '@/shared/ui/use-api-mutation';
import { decidirProposta } from '../api/propostas.api';
import { pendenciaOptions, propostasKeys } from '../api/propostas.queries';
import { decisaoPropostaSchema } from '../schemas/decisao-proposta.schema';

export function AnalisarProposta({
  id,
  onClose,
  invalidates,
}: {
  id: string;
  onClose: () => void;
  invalidates: QueryKey[];
}) {
  const query = useQuery(pendenciaOptions(id));
  const decisao = useApiMutation({
    mutationFn: decidirProposta,
    invalidates: [propostasKeys.all, ['reservas'], ...invalidates],
    successMessage: 'Decisão registrada',
    errorToast: false,
  });
  const detalhe = query.data;
  return (
    <Dialog
      title="Analisar proposta"
      size="amplo"
      open
      onOpenChange={(open) => {
        if (!open && !decisao.isPending) onClose();
      }}
    >
      {query.isPending ? (
        <output>Carregando proposta…</output>
      ) : query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          action={
            <Button onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : detalhe ? (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-small text-ink-muted">Valor proposto</dt>
              <dd className="font-bold">
                {formatMoeda(detalhe.proposta.valor)}
              </dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">Prazo de análise</dt>
              <dd>
                <time dateTime={detalhe.proposta.prazoLimite}>
                  {formatDataHora(detalhe.proposta.prazoLimite)}
                </time>
                {detalhe.proposta.atrasada ? (
                  <span className="ml-2 font-bold text-danger">Em atraso</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">Lote</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {detalhe.lote ? (
                  <>
                    <Link
                      className="font-bold underline"
                      href={`/lotes/${detalhe.lote.id}`}
                    >
                      Lote {detalhe.lote.numero}
                    </Link>
                    <StatusLoteBadge status={detalhe.lote.status} />
                    <span>{formatArea(detalhe.lote.areaM2)}</span>
                  </>
                ) : (
                  'Lote removido'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">Cliente</dt>
              <dd>
                {detalhe.cliente ? (
                  <Link
                    className="font-bold underline"
                    href={`/clientes/${detalhe.cliente.id}`}
                  >
                    {detalhe.cliente.nome}
                  </Link>
                ) : (
                  'Cliente removido'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">Início da reserva</dt>
              <dd>{formatDataHora(detalhe.reserva.dataInicio)}</dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">
                Vencimento da reserva
              </dt>
              <dd>{formatDataHora(detalhe.reserva.dataVencimento)}</dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">Status da reserva</dt>
              <dd>
                {
                  {
                    ATIVA: 'Ativa',
                    CANCELADA: 'Cancelada',
                    EXPIRADA: 'Expirada',
                    CONVERTIDA: 'Convertida',
                  }[detalhe.reserva.status]
                }
              </dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">
                Condições de pagamento
              </dt>
              <dd className="whitespace-pre-line wrap-anywhere">
                {detalhe.proposta.condicoes}
              </dd>
            </div>
            <div>
              <dt className="text-small text-ink-muted">Observações</dt>
              <dd className="whitespace-pre-line wrap-anywhere">
                {detalhe.proposta.observacoes || 'Sem observações'}
              </dd>
            </div>
          </dl>
          <p className="text-small text-ink-muted">
            A aprovação da proposta mantém o lote reservado. A venda é
            confirmada em uma ação própria.
          </p>
          {detalhe.proposta.status === 'EM_ANALISE' &&
          !detalhe.proposta.encerrada ? (
            <Form
              schema={decisaoPropostaSchema}
              defaultValues={{ motivo: '' }}
              submitLabel="Confirmar decisão"
              onSubmit={async (values) => {
                await decisao.mutateAsync({ id, ...values });
                onClose();
              }}
            >
              <FormSelect
                name="decisao"
                label="Decisão"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione a decisão
                </option>
                <option value="aprovar">Aprovar proposta</option>
                <option value="rejeitar">Rejeitar proposta</option>
              </FormSelect>
              <FormTextarea
                name="motivo"
                label="Motivo da decisão"
                required
                maxLength={10000}
              />
            </Form>
          ) : (
            <Alert>
              Esta proposta já foi decidida ou encerrada. Atualize a lista para
              consultar as pendências atuais.
            </Alert>
          )}
        </>
      ) : null}
      <Button
        variant="secundario"
        disabled={decisao.isPending}
        onClick={onClose}
      >
        Voltar à lista
      </Button>
    </Dialog>
  );
}
