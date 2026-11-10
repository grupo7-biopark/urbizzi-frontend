import { request } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function setup(config) {
  const backend = resolve(process.env.E2E_BACKEND_DIR);
  const requireBackend = createRequire(resolve(backend, 'package.json'));
  const { PrismaPg } = requireBackend('@prisma/adapter-pg');
  const { PrismaClient } = await import(
    pathToFileURL(resolve(backend, 'dist/generated/prisma/client.js')).href
  );
  const argon2 = requireBackend('argon2');
  const database = new URL(process.env.DATABASE_URL);
  if (
    !/^\/urbizzi_(fe_e2e_|frontend_goal_test_)[a-z0-9_]+$/.test(
      database.pathname,
    )
  )
    throw new Error('Banco não autorizado para teste.');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: database.href }),
  });
  const senha = `E2e!${randomBytes(18).toString('hex')}`;
  const senhaHash = await argon2.hash(senha);
  const suffix = randomUUID().slice(0, 8);
  const accounts = {};
  await mkdir('e2e/.auth', { recursive: true });
  try {
    for (const [name, codigo] of [
      ['gestor', 'GESTOR'],
      ['comercial', 'COMERCIAL'],
      ['outro', 'COMERCIAL'],
      ['consulta', 'CONSULTA'],
    ]) {
      const perfil = await prisma.perfil.upsert({
        where: { codigo },
        update: {},
        create: { codigo, nome: codigo },
      });
      const email = `${name}.${suffix}@e2e.urbizzi.test`;
      const usuario = await prisma.usuario.create({
        data: {
          nome: `Pessoa E2E ${name}`,
          email,
          senhaHash,
          perfilId: perfil.id,
        },
      });
      accounts[name] = { id: usuario.id, nome: usuario.nome };
      const baseURL = config.projects[0].use.baseURL;
      const session = await request.newContext({
        baseURL,
        extraHTTPHeaders: { Origin: baseURL },
      });
      const login = await session.post('/api/auth/login', {
        data: { email, senha },
      });
      if (!login.ok())
        throw new Error(
          `Falha de autenticação da conta fictícia ${name}: HTTP ${login.status()}`,
        );
      await session.storageState({ path: `e2e/.auth/${name}.json` });
      await session.dispose();
    }
    const baseURL = config.projects[0].use.baseURL;
    const gestor = await request.newContext({
      baseURL,
      storageState: 'e2e/.auth/gestor.json',
      extraHTTPHeaders: { Origin: baseURL },
    });
    try {
      // PNG fictício de teste processado de verdade pelo worker/S3 do backend.
      const sharp = requireBackend('sharp');
      const png = await sharp({
        create: {
          width: 1024,
          height: 1024,
          channels: 3,
          background: '#C5C7C7',
        },
      })
        .png()
        .toBuffer();
      const envio = await gestor.post('/api/backend/v1/plantas', {
        multipart: {
          nome: `Planta E2E ${suffix}`,
          arquivos: {
            name: 'planta-e2e.png',
            mimeType: 'image/png',
            buffer: png,
          },
        },
      });
      if (!envio.ok())
        throw new Error(`Upload real da planta falhou: HTTP ${envio.status()}`);
      const planta = await envio.json();
      let pronta = false;
      for (let tentativa = 0; tentativa < 40; tentativa++) {
        const resposta = await gestor.get(
          `/api/backend/v1/plantas/${planta.id}`,
        );
        const atual = await resposta.json();
        if (atual.status === 'ERRO')
          throw new Error(
            'O processamento real da planta falhou. Verifique a configuração S3 do backend de teste.',
          );
        if (atual.status === 'PRONTA') {
          pronta = true;
          break;
        }
        await new Promise((concluirEspera) => setTimeout(concluirEspera, 1000));
      }
      if (!pronta)
        throw new Error(
          'A planta não ficou pronta em 40 segundos. Habilite o worker do backend de teste.',
        );
      const ativacao = await gestor.post(
        `/api/backend/v1/plantas/${planta.id}/ativar`,
      );
      if (!ativacao.ok())
        throw new Error(
          `Ativação real da planta falhou: HTTP ${ativacao.status()}`,
        );
      await writeFile(
        'e2e/.auth/scenario.json',
        JSON.stringify({ accounts, suffix, plantaId: planta.id }),
      );
    } finally {
      await gestor.dispose();
    }
  } finally {
    await prisma.$disconnect();
  }
}
