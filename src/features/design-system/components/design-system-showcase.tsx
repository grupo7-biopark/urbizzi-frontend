'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Badge, StatusLoteBadge, StatusPropostaBadge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Dialog, DialogClose } from '@/shared/ui/dialog';
import { Drawer } from '@/shared/ui/drawer';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/shared/ui/dropdown';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Logo, LogoSimbolo } from '@/shared/ui/logo';
import { Pagination } from '@/shared/ui/pagination';
import { Select } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Spinner } from '@/shared/ui/spinner';
import { Switch } from '@/shared/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import { ToastProvider, useToast } from '@/shared/ui/toast';
import { Tooltip } from '@/shared/ui/tooltip';
import {
  ConfirmacaoExemplo,
  FormularioExemplo,
  ListagemExemplo,
} from './list-form-showcase';

const CORES = [
  { nome: 'laranja', classe: 'bg-laranja' },
  { nome: 'preto', classe: 'bg-preto' },
  { nome: 'branco', classe: 'bg-branco' },
  { nome: 'prata', classe: 'bg-prata' },
  { nome: 'cinza-oliva', classe: 'bg-cinza-oliva' },
  { nome: 'cinza-carvao', classe: 'bg-cinza-carvao' },
  { nome: 'surface', classe: 'bg-surface' },
  { nome: 'surface-alt', classe: 'bg-surface-alt' },
  { nome: 'ink', classe: 'bg-ink' },
  { nome: 'ink-muted', classe: 'bg-ink-muted' },
  { nome: 'accent', classe: 'bg-accent' },
  { nome: 'on-accent', classe: 'bg-on-accent' },
  { nome: 'border', classe: 'bg-border' },
  { nome: 'danger', classe: 'bg-danger' },
  { nome: 'status-disponivel', classe: 'bg-status-disponivel' },
  { nome: 'status-reservado', classe: 'bg-status-reservado' },
  { nome: 'status-vendido', classe: 'bg-status-vendido' },
  { nome: 'status-bloqueado', classe: 'bg-status-bloqueado' },
];

const TEMAS = [
  { id: 'sistema', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
] as const;

type Tema = (typeof TEMAS)[number]['id'];

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-section-label">{titulo}</h2>
        <span aria-hidden="true" className="h-px grow bg-border" />
      </div>
      {children}
    </section>
  );
}

function SeletorDeTema() {
  const [tema, setTema] = useState<Tema>('sistema');

  useEffect(() => {
    const raiz = document.documentElement;

    if (tema === 'sistema') {
      delete raiz.dataset.theme;
    } else {
      raiz.dataset.theme = tema;
    }

    return () => {
      delete raiz.dataset.theme;
    };
  }, [tema]);

  return (
    <fieldset className="flex gap-1">
      <legend className="sr-only">Tema</legend>
      {TEMAS.map(({ id, label }) => (
        <Button
          key={id}
          variant={tema === id ? 'primario' : 'secundario'}
          aria-pressed={tema === id}
          onClick={() => setTema(id)}
        >
          {label}
        </Button>
      ))}
    </fieldset>
  );
}

function ExemploDeToast() {
  const toast = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secundario"
        onClick={() =>
          toast({
            title: 'Reserva criada',
            description: 'O lote 12 foi reservado.',
            variant: 'sucesso',
          })
        }
      >
        Toast de sucesso
      </Button>
      <Button
        variant="secundario"
        onClick={() =>
          toast({
            title: 'Não foi possível salvar',
            description: 'O lote não está mais disponível.',
            variant: 'erro',
          })
        }
      >
        Toast de erro
      </Button>
      <Button
        variant="secundario"
        onClick={() => toast({ title: 'Sincronizando o mapa' })}
      >
        Toast informativo
      </Button>
    </div>
  );
}

export function DesignSystemShowcase() {
  return (
    <ToastProvider>
      <main className="mx-auto flex max-w-5xl flex-col gap-12 p-4 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Logo className="h-10 w-auto self-start" />
            <h1 className="text-display wrap-anywhere">Design system</h1>
          </div>
          <SeletorDeTema />
        </header>

        <Secao titulo="Cores">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {CORES.map(({ nome, classe }) => (
              <li key={nome} className="flex flex-col gap-1">
                <span className={`h-16 border border-border ${classe}`} />
                <span className="text-small wrap-anywhere">{nome}</span>
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo="Tipografia">
          <div className="flex flex-col gap-3">
            <p className="text-display">display</p>
            <p className="text-heading">heading</p>
            <p className="font-display text-section-label">section-label</p>
            <p className="text-body">
              body: Inter Regular para textos e dados.
            </p>
            <p className="text-small">small: textos de apoio.</p>
            <p className="text-caption">caption: legendas e metadados.</p>
          </div>
        </Secao>

        <Secao titulo="Logos">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex min-h-32 items-center justify-center bg-branco p-6">
              <Logo
                variant="claro"
                assinatura="marca"
                className="h-16 w-auto"
              />
            </div>
            <div className="flex min-h-32 items-center justify-center bg-preto p-6">
              <Logo
                variant="escuro"
                assinatura="marca"
                className="h-16 w-auto"
              />
            </div>
            <div className="flex min-h-32 items-center justify-center bg-laranja p-6">
              <Logo
                variant="laranja"
                assinatura="marca"
                className="h-16 w-auto"
              />
            </div>
            <div className="flex min-h-32 items-center justify-center bg-branco p-6">
              <Logo variant="claro" className="h-8 w-auto" />
            </div>
            <div className="flex min-h-32 items-center justify-center bg-preto p-6">
              <Logo
                variant="escuro"
                arquitetura="vertical"
                className="h-20 w-auto"
              />
            </div>
            <div className="flex min-h-32 items-center justify-center bg-branco p-6">
              <LogoSimbolo className="size-12" />
            </div>
          </div>
        </Secao>

        <Secao titulo="Botões">
          <div className="flex flex-wrap gap-2">
            <Button>Primário</Button>
            <Button variant="secundario">Secundário</Button>
            <Button variant="perigo">Perigo</Button>
            <Button variant="fantasma">Fantasma</Button>
            <Button disabled>Desabilitado</Button>
          </div>
        </Secao>

        <Secao titulo="Formulário">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome" required hint="Como aparece nas listagens." />
            <Input
              label="Documento"
              defaultValue="000"
              error="Informe um documento válido"
            />
            <Select label="Status" defaultValue="DISPONIVEL">
              <option value="DISPONIVEL">Disponível</option>
              <option value="RESERVADO">Reservado</option>
            </Select>
            <Textarea label="Observações" />
            <Checkbox label="Exibir valor no link público" defaultChecked />
            <Switch label="Usuário ativo" defaultChecked />
          </div>
        </Secao>

        <Secao titulo="Status">
          <div className="flex flex-wrap gap-2">
            <StatusLoteBadge status="DISPONIVEL" />
            <StatusLoteBadge status="RESERVADO" />
            <StatusLoteBadge status="VENDIDO" />
            <StatusLoteBadge status="BLOQUEADO" />
            <StatusPropostaBadge status="EM_ANALISE" />
            <StatusPropostaBadge status="APROVADA" />
            <StatusPropostaBadge status="REJEITADA" />
            <Badge>Neutro</Badge>
          </div>
        </Secao>

        <Secao titulo="Sobreposições">
          <div className="flex flex-wrap gap-2">
            <Dialog
              title="Cancelar a reserva do lote 12?"
              description="O lote volta a ficar disponível."
              trigger={<Button variant="secundario">Abrir Dialog</Button>}
              footer={
                <>
                  <DialogClose asChild>
                    <Button variant="secundario">Voltar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="perigo">Cancelar reserva</Button>
                  </DialogClose>
                </>
              }
            />
            <Drawer
              title="Filtros"
              trigger={<Button variant="secundario">Abrir Drawer</Button>}
            >
              <Input label="Buscar por número" />
            </Drawer>
            <Dropdown trigger={<Button variant="secundario">Ações</Button>}>
              <DropdownItem>Editar</DropdownItem>
              <DropdownItem disabled>Duplicar</DropdownItem>
              <DropdownSeparator />
              <DropdownItem variant="perigo">Excluir</DropdownItem>
            </Dropdown>
            <Tooltip content="Mostra o histórico do lote">
              <Button variant="fantasma">Tooltip</Button>
            </Tooltip>
          </div>
          <ExemploDeToast />
        </Secao>

        <Secao titulo="Abas">
          <Tabs defaultValue="dados">
            <TabsList aria-label="Seções do lote">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="propostas">Propostas</TabsTrigger>
              <TabsTrigger value="historico" disabled>
                Histórico
              </TabsTrigger>
            </TabsList>
            <TabsContent value="dados">Dados do lote.</TabsContent>
            <TabsContent value="propostas">Propostas do lote.</TabsContent>
          </Tabs>
        </Secao>

        <Secao titulo="Tabela e paginação">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Quadra</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>12</TableCell>
                <TableCell>A</TableCell>
                <TableCell>
                  <StatusLoteBadge status="DISPONIVEL" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>13</TableCell>
                <TableCell>A</TableCell>
                <TableCell>
                  <StatusLoteBadge status="VENDIDO" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Pagination
            meta={{ page: 4, totalPages: 9 }}
            label="Paginação de exemplo"
            getPageHref={(page) => `/design-system?page=${page}`}
          />
        </Secao>

        <Secao titulo="Estados">
          <div className="flex flex-col gap-4">
            <Skeleton aria-label="Carregando lotes" />
            <Spinner />
            <EmptyState
              title="Nenhum loteamento encontrado"
              description="Cadastre o primeiro loteamento para começar."
              action={<Button>Novo loteamento</Button>}
            />
          </div>
        </Secao>

        <Secao titulo="Listagem com filtros na URL">
          {/* `useSearchParams` exige um limite de Suspense em página estática. */}
          <Suspense
            fallback={
              <Skeleton aria-label="Carregando listagem" className="h-48" />
            }
          >
            <ListagemExemplo />
          </Suspense>
        </Secao>

        <Secao titulo="Formulário">
          <FormularioExemplo />
        </Secao>

        <Secao titulo="Confirmação">
          <ConfirmacaoExemplo />
        </Secao>
      </main>
    </ToastProvider>
  );
}
