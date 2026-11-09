'use client';
import { useState } from 'react';
import { publicEnv } from '@/shared/config/env.public';
import { Permitido } from '@/shared/auth/permitido';
import { Button, buttonClasses } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Input } from '@/shared/ui/input';
import type { LinkPublico } from '../api/links-publicos.api';
import { useDesativarLink } from '../hooks/use-links-publicos';
export function urlLinkPublico(token: string) {
  return new URL(
    `/p/${encodeURIComponent(token)}`,
    publicEnv.NEXT_PUBLIC_APP_URL,
  ).href;
}
export function AcoesLink({ link }: { link: LinkPublico }) {
  const mutation = useDesativarLink();
  const [feedback, setFeedback] = useState('');
  const [manual, setManual] = useState(false);
  const url = urlLinkPublico(link.token);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('Link copiado.');
      setManual(false);
    } catch {
      setManual(true);
      setFeedback('Selecione e copie o endereço abaixo.');
    }
  }
  async function compartilhar() {
    if (!navigator.share) return copiar();
    try {
      await navigator.share({ title: 'Mapa Urbizzi', url });
      setFeedback('Link compartilhado.');
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setManual(true);
        setFeedback('Não foi possível compartilhar. Copie o endereço abaixo.');
      }
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
        {link.ativo ? (
          <>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('fantasma', undefined, 'compacto')}
            >
              Abrir mapa
            </a>
            <Button
              variant="secundario"
              size="compacto"
              onClick={() => void copiar()}
            >
              Copiar link
            </Button>
            <Button
              variant="fantasma"
              size="compacto"
              onClick={() => void compartilhar()}
            >
              Compartilhar
            </Button>
            <Permitido acao="desativarLinkPublico" donoId={link.criadoPorId}>
              <ConfirmDialog
                title="Desativar este link público?"
                description="Quem recebeu este endereço não poderá mais consultar o mapa por ele."
                confirmLabel="Desativar link"
                trigger={
                  <Button variant="perigoSutil" size="compacto">
                    Desativar
                  </Button>
                }
                onConfirm={() => mutation.mutateAsync(link.id)}
              />
            </Permitido>
          </>
        ) : (
          <span className="text-caption text-ink-muted">
            O acesso por este link foi encerrado.
          </span>
        )}
      </div>
      <output className="text-small text-ink-muted">{feedback}</output>
      {manual && link.ativo ? (
        <Input
          label="Endereço público"
          value={url}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
