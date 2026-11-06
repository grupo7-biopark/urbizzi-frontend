import { EmptyState } from '@/shared/ui/empty-state';
import { IconConstrucao } from '@/shared/ui/icon';
import { PageHeader, type BreadcrumbItem } from '@/shared/ui/page-header';

const INICIO: BreadcrumbItem = { label: 'Início', href: '/' };

type TelaProvisoriaProps = {
  titulo: string;
  parents?: BreadcrumbItem[];
};

/** Ocupa a rota do menu, já protegida por perfil, até a issue da tela ser entregue. */
export function TelaProvisoria({
  titulo,
  parents = [INICIO],
}: TelaProvisoriaProps) {
  return (
    <>
      <PageHeader title={titulo} parents={parents} />
      <EmptyState
        icon={<IconConstrucao />}
        title="Tela em construção"
        description="Esta funcionalidade ainda não está disponível."
      />
    </>
  );
}
