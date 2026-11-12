import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function vencerReserva(id, loteId) {
  const banco = new URL(process.env.DATABASE_URL);
  if (
    !/^\/urbizzi_(fe_e2e_|frontend_goal_test_)[a-z0-9_]+$/.test(banco.pathname)
  ) {
    throw new Error('Banco não autorizado para teste de expiração.');
  }
  const backend = resolve(process.env.E2E_BACKEND_DIR);
  const requireBackend = createRequire(resolve(backend, 'package.json'));
  const { PrismaPg } = requireBackend('@prisma/adapter-pg');
  const { PrismaClient } = await import(
    pathToFileURL(resolve(backend, 'dist/generated/prisma/client.js')).href
  );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: banco.href }),
  });
  const agora = Date.now();
  try {
    // Avança só o vencimento do cenário. O job real atualiza o status e libera o lote.
    const alteradas = await prisma.reserva.updateMany({
      where: { id, loteId, status: 'ATIVA' },
      data: {
        dataInicio: new Date(agora - 120_000),
        dataVencimento: new Date(agora - 60_000),
      },
    });
    if (alteradas.count !== 1) {
      throw new Error('Reserva ativa do cenário não encontrada.');
    }
  } finally {
    await prisma.$disconnect();
  }
}
