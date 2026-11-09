import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { http } from '@/test/http';
import { server } from '@/test/server';
import { renderWithQuery } from '@/test/render';
import { setTestUrl } from '@/test/next-navigation';
import { ToastProvider } from '@/shared/ui/toast';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import type { LinkPublico } from '../api/links-publicos.api';
import {
  linkFormSchema,
  linksSearchSchema,
} from '../schemas/links-publicos.schema';
import { LinksPublicosLista } from './links-publicos-lista';
import { AcoesLink, urlLinkPublico } from './acoes-link';
vi.mock('next/navigation', () => import('@/test/next-navigation'));
vi.mock('@/shared/config/env.public', () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: 'http://localhost:3001' },
}));
const id = '5d2f8a1e-8a52-4a8e-9d3f-2c7f1e5a9b10';
const link: LinkPublico = {
  id,
  token: 'a'.repeat(43),
  criadoPorId: id,
  loteamentoId: null,
  ativo: true,
  acessos: 2,
  createdAt: '2026-11-09T12:00:00Z',
  updatedAt: '2026-11-09T12:00:00Z',
};
const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
beforeEach(() => {
  setTestUrl('/links-publicos');
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response(200).json({
        id,
        nome: 'Pessoa fictícia',
        email: 'teste@exemplo.com',
        perfil: 'COMERCIAL',
      }),
    ),
    http.get('/v1/loteamentos', ({ response }) =>
      response(200).json({ data: [makeLoteamento()], meta }),
    ),
    http.get('/v1/links-publicos', ({ response }) =>
      response(200).json({ data: [link], meta }),
    ),
  );
});
function renderLista() {
  return renderWithQuery(
    <ToastProvider>
      <LinksPublicosLista search={{ page: 1, pageSize: 20 }} />
    </ToastProvider>,
  );
}
describe('Links públicos', () => {
  it('gera link com escopo e permite copiar', async () => {
    let body: unknown;
    server.use(
      http.post('/v1/links-publicos', async ({ request, response }) => {
        body = await request.json();
        return response(201).json(link);
      }),
    );
    const user = userEvent.setup();
    renderLista();
    await user.click(screen.getByRole('button', { name: 'Gerar link' }));
    const form = await screen.findByRole('dialog', {
      name: 'Gerar link público',
    });
    await user.selectOptions(
      within(form).getByLabelText('Escopo do mapa'),
      makeLoteamento().id,
    );
    await user.click(within(form).getByRole('button', { name: 'Gerar link' }));
    const result = await screen.findByRole('dialog', {
      name: 'Link público criado',
    });
    expect(body).toEqual({ loteamentoId: makeLoteamento().id });
    await user.click(
      within(result).getByRole('button', { name: 'Copiar link' }),
    );
    expect(await within(result).findByText('Link copiado.')).toBeVisible();
    expect(await navigator.clipboard.readText()).toBe(
      urlLinkPublico(link.token),
    );
  });
  it('desativa com confirmação e atualiza a lista', async () => {
    let ativo = true;
    server.use(
      http.get('/v1/links-publicos', ({ response }) =>
        response(200).json({ data: [{ ...link, ativo }], meta }),
      ),
      http.post('/v1/links-publicos/{id}/desativar', ({ response }) => {
        ativo = false;
        return response(200).json({ ...link, ativo });
      }),
    );
    renderLista();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Desativar' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Desativar link' }),
    );
    expect(await screen.findByText('Desativado')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Copiar link' }),
    ).not.toBeInTheDocument();
  });
  it('oferece cópia manual se a área de transferência falhar', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
      new Error('Indisponível'),
    );
    renderWithQuery(
      <ToastProvider>
        <AcoesLink link={link} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(await screen.findByLabelText('Endereço público')).toHaveValue(
      urlLinkPublico(link.token),
    );
  });
  it('não permite ao Comercial desativar link de outra pessoa', async () => {
    renderWithQuery(
      <ToastProvider>
        <AcoesLink link={{ ...link, criadoPorId: 'outro' }} />
      </ToastProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copiar link' })).toBeVisible(),
    );
    expect(
      screen.queryByRole('button', { name: 'Desativar' }),
    ).not.toBeInTheDocument();
  });
  it('valida escopo e paginação', () => {
    expect(linkFormSchema.parse({ loteamentoId: '' })).toEqual({
      loteamentoId: null,
    });
    expect(linkFormSchema.safeParse({ loteamentoId: 'errado' }).success).toBe(
      false,
    );
    expect(linksSearchSchema.parse({ page: 'x', pageSize: 999 })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });
  it('mostra erro, recupera e orienta quando não há links', async () => {
    server.use(
      http.untyped.get(
        '*/v1/links-publicos',
        () => new Response(null, { status: 503 }),
      ),
    );
    renderLista();
    expect(screen.getByLabelText('Carregando: Links públicos')).toBeVisible();
    expect(await screen.findByRole('alert')).toBeVisible();
    server.use(
      http.get('/v1/links-publicos', ({ response }) =>
        response(200).json({
          data: [],
          meta: { ...meta, total: 0, totalPages: 0 },
        }),
      ),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    expect(await screen.findByText('Nenhum link público criado')).toBeVisible();
  });
});
