'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/drawer';
import { IconMenu } from '@/shared/ui/icon';
import { MenuNavegacao } from './menu-navegacao';

export function MenuCelular({ pendencias }: { pendencias?: ReactNode }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Drawer
      side="left"
      title="Menu"
      tema="dark"
      open={aberto}
      onOpenChange={setAberto}
      trigger={
        <Button variant="fantasma" size="icone" aria-label="Menu">
          <IconMenu />
        </Button>
      }
    >
      <MenuNavegacao
        pendencias={pendencias}
        onNavigate={() => setAberto(false)}
      />
    </Drawer>
  );
}
