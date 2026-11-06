import type { Metadata } from 'next';
import { TelaProvisoria } from '@/features/navegacao/components/tela-provisoria';
import { exigirPermissao } from '@/shared/auth/permissao.server';

export const metadata: Metadata = { title: 'Reservas' };

export default async function ReservasPage() {
  await exigirPermissao('listarReservas');

  return <TelaProvisoria titulo="Reservas" />;
}
