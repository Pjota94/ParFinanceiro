export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { get, batch } from '../../../../server/db';

export async function POST(req: Request) {
  // Em produção, após criar a conta do casal, defina ALLOW_REGISTRATION=false
  if (process.env.ALLOW_REGISTRATION === 'false') {
    return NextResponse.json({ error: 'Cadastro desativado' }, { status: 403 });
  }

  const { coupleName, person1, person2 } = await req.json();

  if (!coupleName || !person1 || !person2) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }
  if (!person1.name || !person1.email || !person1.password) {
    return NextResponse.json({ error: 'Dados da pessoa 1 incompletos' }, { status: 400 });
  }
  if (!person2.name || !person2.email || !person2.password) {
    return NextResponse.json({ error: 'Dados da pessoa 2 incompletos' }, { status: 400 });
  }
  if (person1.email === person2.email) {
    return NextResponse.json({ error: 'Os e-mails devem ser diferentes' }, { status: 400 });
  }

  const existing1 = await get('SELECT id FROM users WHERE email = ?', [person1.email]);
  const existing2 = await get('SELECT id FROM users WHERE email = ?', [person2.email]);
  if (existing1) return NextResponse.json({ error: 'E-mail da pessoa 1 já cadastrado' }, { status: 400 });
  if (existing2) return NextResponse.json({ error: 'E-mail da pessoa 2 já cadastrado' }, { status: 400 });

  const coupleId = uuidv4();
  const user1Id = uuidv4();
  const user2Id = uuidv4();
  const hash1 = await bcrypt.hash(person1.password, 10);
  const hash2 = await bcrypt.hash(person2.password, 10);

  const insertUser =
    'INSERT INTO users (id, couple_id, name, email, password_hash, avatar_color, role) VALUES (?, ?, ?, ?, ?, ?, ?)';

  await batch([
    { sql: 'INSERT INTO couples (id, couple_name) VALUES (?, ?)', args: [coupleId, coupleName] },
    { sql: insertUser, args: [user1Id, coupleId, person1.name, person1.email, hash1, '#8B5CF6', 'owner'] },
    { sql: insertUser, args: [user2Id, coupleId, person2.name, person2.email, hash2, '#EC4899', 'member'] },
  ]);

  return NextResponse.json({ message: 'Casal cadastrado com sucesso!', coupleId }, { status: 201 });
}
