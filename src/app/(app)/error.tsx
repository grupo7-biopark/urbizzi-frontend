'use client';

import { Button } from '@/shared/ui/button';

export default function AppError({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-heading">Não foi possível carregar esta página</h1>
      <p role="alert">Tente novamente em instantes.</p>
      <Button onClick={retry}>Tentar novamente</Button>
    </main>
  );
}
