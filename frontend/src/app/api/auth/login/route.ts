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
  avatar_url?: string | null;
  role: string;
}

interface PartnerRow {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  avatar_url: string | null;
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
  const partner = await get<PartnerRow>(
    'SELECT id, name, email, avatar_color, avatar_url FROM users WHERE couple_id = ? AND id != ?',
    [user.couple_id, user.id]
  );

  const token = signToken({ userId: user.id, coupleId: user.couple_id, name: user.name, email: user.email });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatarColor: user.avatar_color, avatarUrl: user.avatar_url, role: user.role },
    couple: { id: couple!.id, name: couple!.couple_name },
    partner: partner
      ? { id: partner.id, name: partner.name, email: partner.email, avatarColor: partner.avatar_color, avatarUrl: partner.avatar_url }
      : null,
  });
}
