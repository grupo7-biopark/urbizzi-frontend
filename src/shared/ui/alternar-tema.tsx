'use client';

import { Button } from './button';
import { IconTema } from './icon';

function alternar() {
  const raiz = document.documentElement;
  const escuro = raiz.dataset.theme
    ? raiz.dataset.theme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tema = escuro ? 'light' : 'dark';
  raiz.dataset.theme = tema;
  try {
    localStorage.setItem('urbizzi-tema', tema);
  } catch {
    // A troca continua funcionando quando o navegador bloqueia armazenamento.
  }
}

export function AlternarTema() {
  return (
    <Button
      variant="fantasma"
      size="icone"
      aria-label="Alternar tema claro ou escuro"
      title="Alternar tema claro ou escuro"
      onClick={alternar}
    >
      <IconTema />
    </Button>
  );
}
