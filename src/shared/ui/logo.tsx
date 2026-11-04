import Image from 'next/image';
import { cn } from './cn';

type LogoArquitetura = 'horizontal' | 'vertical';
type LogoAssinatura = 'marca' | 'tagline' | 'wordmark';
type LogoFundo = 'claro' | 'escuro' | 'laranja';

type LogoAsset = { src: string; width: number; height: number };

// Tamanhos iguais aos atributos de cada SVG em public/brand.
const DIMENSOES = {
  horizontal: {
    principal: [828, 276],
    marca: [426, 144],
    tagline: [426, 106],
    wordmark: [426, 106],
    simbolo: [192, 192],
  },
  vertical: {
    principal: [466, 460],
    marca: [213, 211],
    tagline: [213, 189],
    wordmark: [213, 174],
    simbolo: [192, 192],
  },
} as const;

// Únicas combinações aprovadas pelo manual: preto é a única versão sobre laranja.
const COR_MONOCROMATICA: Record<LogoFundo, string> = {
  claro: 'orange',
  escuro: 'white',
  laranja: 'black',
};

export function getLogoAsset(
  arquitetura: LogoArquitetura,
  assinatura: LogoAssinatura,
  fundo: LogoFundo,
): LogoAsset {
  if (assinatura === 'marca' && fundo !== 'laranja') {
    const sufixo = fundo === 'claro' ? 'primary' : 'primary-dark';
    const [width, height] = DIMENSOES[arquitetura].principal;

    return {
      src: `/brand/urbizzi-${arquitetura}-${sufixo}.svg`,
      width,
      height,
    };
  }

  const nivel = assinatura === 'marca' ? 'biopark' : assinatura;
  const [width, height] = DIMENSOES[arquitetura][assinatura];

  return {
    src: `/brand/urbizzi-${arquitetura}-${nivel}-${COR_MONOCROMATICA[fundo]}.svg`,
    width,
    height,
  };
}

const SIMBOLO: LogoAsset = {
  src: '/brand/urbizzi-symbol-orange.svg',
  width: DIMENSOES.horizontal.simbolo[0],
  height: DIMENSOES.horizontal.simbolo[1],
};

type LogoProps = {
  /** O fundo em que o logo será exibido. `tema` acompanha o tema claro ou escuro. */
  variant?: LogoFundo | 'tema';
  arquitetura?: LogoArquitetura;
  /** Abaixo de 120px de largura use `wordmark`: a tagline e o "by Biopark" ficam ilegíveis. */
  assinatura?: LogoAssinatura;
  alt?: string;
  className?: string;
};

export function Logo({
  variant = 'tema',
  arquitetura = 'horizontal',
  assinatura = 'wordmark',
  alt = 'Urbizzi',
  className,
}: LogoProps) {
  if (variant === 'tema') {
    return (
      <>
        <Image
          {...getLogoAsset(arquitetura, assinatura, 'claro')}
          alt={alt}
          className={cn('dark:hidden', className)}
        />
        <Image
          {...getLogoAsset(arquitetura, assinatura, 'escuro')}
          alt={alt}
          className={cn('hidden dark:block', className)}
        />
      </>
    );
  }

  return (
    <Image
      {...getLogoAsset(arquitetura, assinatura, variant)}
      alt={alt}
      className={className}
    />
  );
}

/** Só o símbolo laranja, para favicon, avatar e selo. Nunca sobre fundo laranja nem cinza-oliva. */
export function LogoSimbolo({
  alt = 'Urbizzi',
  className,
}: {
  alt?: string;
  className?: string;
}) {
  return <Image {...SIMBOLO} alt={alt} className={className} />;
}
