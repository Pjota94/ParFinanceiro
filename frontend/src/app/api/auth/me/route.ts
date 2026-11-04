export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { get } from '../../../../server/db';
import { getAuth, unauthorized } from '../../../../server/auth';

interface UserRow {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  role: string;
}

export async function GET(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const user = await get<UserRow>('SELECT id, name, email, avatar_color, role FROM users WHERE id = ?', [auth.userId]);
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const couple = await get<{ id: string; couple_name: string }>('SELECT * FROM couples WHERE id = ?', [auth.coupleId]);
  const partner = await get(
    'SELECT id, name, email, avatar_color FROM users WHERE couple_id = ? AND id != ?',
    [auth.coupleId, user.id]
  );

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, avatarColor: user.avatar_color, role: user.role },
    couple: { id: couple!.id, name: couple!.couple_name },
    partner: partner ?? null,
  });
}
