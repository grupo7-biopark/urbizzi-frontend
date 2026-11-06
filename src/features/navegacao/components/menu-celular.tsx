'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/drawer';
import { IconMenu } from '@/shared/ui/icon';
import { MenuNavegacao } from './menu-navegacao';

export function MenuCelular() {
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
      <MenuNavegacao onNavigate={() => setAberto(false)} />
    </Drawer>
  );
}
