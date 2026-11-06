import type { NextConfig } from 'next';

const watchPollIntervalMs = Number(process.env.WATCH_POLL_INTERVAL_MS);

const nextConfig: NextConfig = {
  output: 'standalone',
  // Habilita o `forbidden()`, usado só em `shared/auth/permissao.server.ts`.
  experimental: { authInterrupts: true },
  // Eventos de arquivo não atravessam bind mounts no Docker Desktop (Windows/macOS).
  ...(watchPollIntervalMs > 0 && {
    watchOptions: { pollIntervalMs: watchPollIntervalMs },
  }),
};

export default nextConfig;
