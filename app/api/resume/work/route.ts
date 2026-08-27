import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const rows = db.prepare('SELECT * FROM resume_work_experiences WHERE alumni_id = ? ORDER BY sort_order ASC, start_year DESC').all(userRow.alumni_id);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const body = await req.json();
    const { company, position, location, start_year, end_year, is_current, description } = body;
    if (!company || !position || !start_year) return NextResponse.json({ error: '公司、职位、起始时间为必填项' }, { status: 400 });
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as max FROM resume_work_experiences WHERE alumni_id = ?').get(userRow.alumni_id) as { max: number })?.max || 0;
    const result = db.prepare(
      'INSERT INTO resume_work_experiences (alumni_id, company, position, location, start_year, end_year, is_current, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userRow.alumni_id, company, position, location || null, start_year, is_current ? null : (end_year || null), is_current ? 1 : 0, description || null, maxOrder + 1);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
