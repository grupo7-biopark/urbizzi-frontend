import type { Metadata } from 'next';
import { z } from 'zod';
import { getMapaPublico } from '@/features/links-publicos/api/mapa-publico.server';
import { MapaPublico } from '@/features/links-publicos/components/mapa-publico';
import { ApiError } from '@/shared/api/errors';
import { publicEnv } from '@/shared/config/env.public';
import { Logo } from '@/shared/ui/logo';
import { Pagination } from '@/shared/ui/pagination';
import { StatusPage } from '@/shared/ui/status-page';
export const metadata: Metadata = {
  title: 'Mapa público',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  openGraph: {
    title: 'Mapa público | Urbizzi',
    description: 'Consulte a disponibilidade dos lotes.',
    images: [
      {
        url: '/brand/urbizzi-mapa-publico.png',
        width: 1200,
        height: 630,
        alt: 'Urbizzi',
      },
    ],
  },
};
export const dynamic = 'force-dynamic';
export default async function MapaPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const valido = z
    .string()
    .regex(/^[A-Za-z0-9_-]{43}$/)
    .safeParse(token);
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .catch(1)
    .parse((await searchParams).page);
  let dados;
  let temporario = false;
  if (valido.success) {
    try {
      dados = await getMapaPublico(token, page);
    } catch (error) {
      temporario = !(error instanceof ApiError && error.statusCode === 404);
    }
  }
  if (!dados)
    return (
      <StatusPage
        standalone
        title={
          temporario ? 'Mapa temporariamente indisponível' : 'Mapa indisponível'
        }
        description={
          temporario
            ? 'Tente novamente em alguns instantes.'
            : 'Peça um novo link à equipe que compartilhou este mapa.'
        }
        action={null}
      />
    );
  return (
    <main className="mx-auto flex max-w-screen-2xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <Logo className="h-10 w-auto" />
        <h1 className="text-heading">Mapa público</h1>
      </header>
      <MapaPublico dados={dados} token={token} />
      <Pagination
        meta={dados.marcadores.meta}
        getPageHref={(p) => `/p/${encodeURIComponent(token)}?page=${p}`}
      />
    </main>
  );
}
