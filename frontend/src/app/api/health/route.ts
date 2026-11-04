export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  const missing: string[] = [];
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.TURSO_DATABASE_URL) missing.push('TURSO_DATABASE_URL');
  if (!process.env.TURSO_AUTH_TOKEN) missing.push('TURSO_AUTH_TOKEN');

  return NextResponse.json({
    status: 'ok',
    name: 'Par Financeiro API',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'undefined',
    missingEnv: missing,
  });
}
