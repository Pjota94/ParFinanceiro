export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { get } from '../../../../server/db';
import { signToken } from '../../../../server/auth';

interface UserRow {
  id: string;
  couple_id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_color: string;
  role: string;
}

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
  }

  const user = await get<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });

  const couple = await get<{ id: string; couple_name: string }>('SELECT * FROM couples WHERE id = ?', [user.couple_id]);
  const partner = await get(
    'SELECT id, name, email, avatar_color FROM users WHERE couple_id = ? AND id != ?',
    [user.couple_id, user.id]
  );

  const token = signToken({ userId: user.id, coupleId: user.couple_id, name: user.name, email: user.email });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatarColor: user.avatar_color, role: user.role },
    couple: { id: couple!.id, name: couple!.couple_name },
    partner: partner ?? null,
  });
}
