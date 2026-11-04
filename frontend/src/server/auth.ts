import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'parfinanceiro_secret_2024';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('[config] JWT_SECRET ausente em produção — defina a variável no projeto da Vercel.');
}

export interface TokenPayload {
  userId: string;
  coupleId: string;
  name: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Lê e valida o Bearer token do cabeçalho Authorization.
 * Retorna o payload, ou null se ausente/inválido.
 */
export function getAuth(req: Request): TokenPayload | null {
  const header = req.headers.get('authorization');
  const token = header && header.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Resposta 401 padrão para rotas protegidas. */
export function unauthorized() {
  return NextResponse.json({ error: 'Token de acesso necessário' }, { status: 401 });
}
