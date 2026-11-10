import type { Metadata } from 'next';
import { ReservasComAcoes } from './reservas-com-acoes';
import { reservasSearchSchema } from '@/features/reservas/schemas/reservas-search.schema';
import { exigirPermissao } from '@/shared/auth/permissao.server';
import { podeExecutar } from '@/shared/auth/permissoes';
import { PageHeader } from '@/shared/ui/page-header';

export const metadata: Metadata = { title: 'Reservas' };

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await exigirPermissao('listarReservas');
  const search = reservasSearchSchema.parse(await searchParams);
  const verTodas = podeExecutar(usuario, 'verTodasReservas');
  return (
    <>
      <PageHeader
        title={
          !verTodas || search.minhas === 'true' ? 'Minhas reservas' : 'Reservas'
        }
        parents={[{ label: 'Início', href: '/' }]}
      />
      <ReservasComAcoes search={search} verTodas={verTodas} />
    </>
  );
}
