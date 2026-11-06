import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/shared/api/query-provider';
import { publicEnv } from '@/shared/config/env.public';
import { bebasNeue, inter } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: { default: 'Urbizzi', template: '%s | Urbizzi' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="bg-surface font-sans text-body text-ink">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
