export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { get, exec } from '../../../../../server/db';
import { getAuth, unauthorized } from '../../../../../server/auth';

interface FixedRow {
  id: string;
  user_id: string;
  recurrence: string;
  month: number;
  year: number;
}

type Ctx = { params: Promise<{ id: string }> };

/**
 * Encerra a recorrência de um gasto fixo: ele continua aparecendo até o mês
 * visualizado e some dos meses seguintes. Aceita o id de um lançamento real ou o
 * id de uma projeção ("proj-fixo-<id>-<ano>-<mês>").
 */
export async function POST(req: Request, ctx: Ctx) {
  const auth = getAuth(req);
  if (!auth) return unauthorized();
  const { id } = await ctx.params;

  let sourceId = id;
  let lastIdx: number | null = null;
  const proj = /^proj-fixo-(.+)-(\d{4})-(\d{1,2})$/.exec(id);
  if (proj) {
    sourceId = proj[1];
    lastIdx = parseInt(proj[2]) * 12 + parseInt(proj[3]) - 1;
  }

  const row = await get<FixedRow>('SELECT * FROM expenses WHERE id = ? AND couple_id = ?', [sourceId, auth.coupleId]);
  if (!row) return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
  if (row.user_id !== auth.userId) {
    return NextResponse.json({ error: 'Você só pode encerrar seus próprios gastos' }, { status: 403 });
  }
  if (row.recurrence !== 'fixo') {
    return NextResponse.json({ error: 'Só gastos fixos podem ser encerrados' }, { status: 400 });
  }

  const rowIdx = row.year * 12 + row.month - 1;
  if (lastIdx === null || lastIdx < rowIdx) lastIdx = rowIdx;

  await exec('UPDATE expenses SET recurrence_end = ? WHERE id = ?', [lastIdx, sourceId]);
  return NextResponse.json({ message: 'Recorrência encerrada', recurrence_end: lastIdx });
}
