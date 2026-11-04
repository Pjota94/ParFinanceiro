import type { NextConfig } from 'next';

// URL do backend. Em produção (Vercel) defina API_URL com a URL pública do
// projeto do backend, ex.: https://par-financeiro-api.vercel.app
// Aceita com ou sem "/api" no final, e sem barra final.
const rawApi = process.env.API_URL || 'http://localhost:3001';
const apiBase = rawApi.replace(/\/+$/, '').replace(/\/api$/, '');

if (process.env.NODE_ENV === 'production' && !process.env.API_URL) {
  // Aparece nos logs de build da Vercel: sinaliza a causa de /api dar erro.
  console.warn(
    '[next.config] API_URL não definido — as chamadas /api vão falhar em produção. ' +
      'Defina API_URL nas Environment Variables do projeto do frontend.'
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
