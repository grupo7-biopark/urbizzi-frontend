import type { ComponentProps, ComponentType } from 'react';
import { cn } from './cn';

export type IconProps = { className?: string };
export type IconComponent = ComponentType<IconProps>;

/**
 * Pontas e cantos retos, como pede o manual da marca. Os ícones são decorativos:
 * o nome acessível vem do texto ao lado ou do `aria-label` do botão.
 */
function Svg({ className, children, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn('size-5 shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  );
}

function criarIcone(d: string): IconComponent {
  return function Icone({ className }: IconProps) {
    return (
      <Svg className={className}>
        <path d={d} />
      </Svg>
    );
  };
}

export const IconInicio = criarIcone('M3 11l9-8 9 8M5 9v12h14V9M10 21v-7h4v7');
export const IconMapa = criarIcone(
  'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
);
export const IconLoteamentos = criarIcone('M3 3h18v18H3zM3 12h18M12 3v18');
export const IconLotes = criarIcone(
  'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M9 9h6v6H9z',
);
export const IconPlantas = criarIcone(
  'M3 3h18v18H3zM3 9h7v6H3M14 3v7h7M10 21v-6h5v6',
);
export const IconEnviar = criarIcone('M12 16V4M7 9l5-5 5 5M4 20h16');
export const IconClientes = criarIcone(
  'M5 3h8v8H5zM3 21v-6h12v6M17 3h3v8h-3M19 15h2v6h-2',
);
export const IconReservas = criarIcone(
  'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4M12 13v4h3',
);
export const IconPropostas = criarIcone(
  'M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6',
);
export const IconPendencias = criarIcone(
  'M8 4H5v18h14V4h-3M8 2h8v4H8zM9 14l2 2 4-4',
);
export const IconLink = criarIcone('M10 8H4v8h6M14 8h6v8h-6M8 12h8');
export const IconHistorico = criarIcone(
  'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2',
);
export const IconUsuarios = criarIcone('M8 3h8v8H8zM4 21v-6h16v6');
export const IconConfiguracoes = criarIcone(
  'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M13 4h4v4h-4zM7 10h4v4H7zM15 16h4v4h-4z',
);
export const IconBusca = criarIcone(
  'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5',
);
export const IconMenu = criarIcone('M3 6h18M3 12h18M3 18h18');
export const IconFechar = criarIcone('M5 5l14 14M19 5L5 19');
export const IconChevronDireita = criarIcone('M9 5l7 7-7 7');
export const IconChevronEsquerda = criarIcone('M15 5l-7 7 7 7');
export const IconChevronBaixo = criarIcone('M5 9l7 7 7-7');
export const IconAlerta = criarIcone('M12 3L2 21h20zM12 10v5M12 18v.01');
export const IconSucesso = criarIcone('M4 12l5 5L20 6');
export const IconInfo = criarIcone('M3 3h18v18H3zM12 11v6M12 7v.01');
export const IconSair = criarIcone('M10 4H4v16h6M15 8l4 4-4 4M19 12H9');
export const IconEditar = criarIcone('M4 20v-4L16 4l4 4L8 20zM13 7l4 4');
export const IconRemover = criarIcone(
  'M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 11v5M14 11v5',
);
export const IconConstrucao = criarIcone(
  'M9.5 3h5L19 21H5zM8 9h8M6.5 15h11M2 21h20',
);
export const IconVazio = criarIcone('M3 13l3-9h12l3 9v7H3zM3 13h6l1 3h4l1-3h6');

export const IconMais = criarIcone('M12 5v14M5 12h14');
export const IconMenos = criarIcone('M5 12h14');
export const IconCentralizar = criarIcone(
  'M12 3v4M12 17v4M3 12h4M17 12h4M8 8h8v8H8z',
);
export const IconTelaCheia = criarIcone(
  'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
);
export const IconSairTelaCheia = criarIcone(
  'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
);
