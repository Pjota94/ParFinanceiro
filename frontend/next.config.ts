import type { NextConfig } from 'next';

// Backend e frontend agora vivem no mesmo app Next.js: as rotas da API estão
// em src/app/api/*. Não há mais proxy para um backend externo.
const nextConfig: NextConfig = {};

export default nextConfig;
