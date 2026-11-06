'use client';

import { Button } from '@/shared/ui/button';
import { StatusPage } from '@/shared/ui/status-page';

export default function AppError({ retry }: { retry: () => void }) {
  return (
    <StatusPage
      alert
      title="Não foi possível carregar esta página"
      description="Tente novamente em instantes."
      action={<Button onClick={retry}>Tentar novamente</Button>}
    />
  );
}
