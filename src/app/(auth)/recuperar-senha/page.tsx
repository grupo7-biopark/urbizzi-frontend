import type { Metadata } from 'next';
import { RecuperarSenha } from '@/features/auth/components/recuperar-senha';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function RecuperarSenhaPage() {
  return <RecuperarSenha />;
}
