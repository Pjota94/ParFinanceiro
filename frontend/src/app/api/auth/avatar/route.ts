export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { exec } from '../../../../server/db';
import { getAuth, unauthorized } from '../../../../server/auth';

// A foto é redimensionada no navegador (~256px); este limite protege o banco.
const MAX_LENGTH = 150_000;
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

/** Define (image = data URL) ou remove (image = null) a foto do usuário logado. */
export async function PUT(req: Request) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();

  const body = await req.json().catch(() => null);
  const image = body?.image;

  if (image === null) {
    await exec('UPDATE users SET avatar_url = NULL WHERE id = ?', [auth.userId]);
    return NextResponse.json({ avatarUrl: null });
  }
  if (typeof image !== 'string' || !DATA_URL.test(image)) {
    return NextResponse.json({ error: 'Envie uma imagem JPG, PNG ou WebP' }, { status: 400 });
  }
  if (image.length > MAX_LENGTH) {
    return NextResponse.json({ error: 'Imagem muito grande' }, { status: 413 });
  }

  await exec('UPDATE users SET avatar_url = ? WHERE id = ?', [image, auth.userId]);
  return NextResponse.json({ avatarUrl: image });
}
