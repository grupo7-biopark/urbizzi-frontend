import { buttonClasses } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/panel';

function identificarCanal(valor: string) {
  if (/^mailto:[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(valor))
    return { href: valor, label: 'Enviar e-mail' };
  if (/^tel:\+?[\d ()-]{8,25}$/.test(valor))
    return { href: valor.replace(/[ ()-]/g, ''), label: 'Ligar' };
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return {
      href: url.href,
      label: ['wa.me', 'api.whatsapp.com'].includes(url.hostname)
        ? 'WhatsApp'
        : 'Abrir atendimento',
    };
  } catch {
    return null;
  }
}

export function ContatoMapaPublico({ contato }: { contato: string }) {
  return (
    <Panel title="Atendimento">
      <ul className="flex flex-wrap items-center gap-3">
        {[
          ...new Set(
            contato
              .split(/\r?\n/)
              .map((linha) => linha.trim())
              .filter(Boolean),
          ),
        ].map((linha) => {
          const canal = identificarCanal(linha);
          return (
            <li key={linha} className="min-w-0 wrap-anywhere">
              {canal ? (
                <a href={canal.href} className={buttonClasses('secundario')}>
                  {canal.label}
                </a>
              ) : (
                linha
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
