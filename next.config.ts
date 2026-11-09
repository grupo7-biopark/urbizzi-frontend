import type { NextConfig } from 'next';

const watchPollIntervalMs = Number(process.env.WATCH_POLL_INTERVAL_MS);

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/p/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  // Habilita o `forbidden()`, usado só em `shared/auth/permissao.server.ts`.
  experimental: { authInterrupts: true },
  // Eventos de arquivo não atravessam bind mounts no Docker Desktop (Windows/macOS).
  ...(watchPollIntervalMs > 0 && {
    watchOptions: { pollIntervalMs: watchPollIntervalMs },
  }),
};

export default nextConfig;
