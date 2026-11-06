'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/drawer';
import { MenuNavegacao } from './menu-navegacao';

export function MenuCelular() {
  const [aberto, setAberto] = useState(false);

  return (
    <Drawer
      side="left"
      title="Menu"
      open={aberto}
      onOpenChange={setAberto}
      trigger={<Button variant="secundario">Menu</Button>}
    >
      <MenuNavegacao onNavigate={() => setAberto(false)} />
    </Drawer>
  );
}
