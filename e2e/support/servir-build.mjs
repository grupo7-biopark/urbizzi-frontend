import { cp, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const standalone = resolve('.next/standalone');
const server = resolve(standalone, 'server.js');
await access(server).catch(() => {
  throw new Error('Gere o build do frontend antes do E2E real.');
});
await cp('public', resolve(standalone, 'public'), { recursive: true });
await cp('.next/static', resolve(standalone, '.next/static'), {
  recursive: true,
});
process.env.PORT =
  new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3021').port || '3021';
process.env.HOSTNAME = '127.0.0.1';
process.env.NODE_ENV = 'production';
await import(pathToFileURL(server).href);
