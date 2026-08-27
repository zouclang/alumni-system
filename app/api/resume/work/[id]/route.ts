import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const { id } = await params;
    const existing = db.prepare('SELECT * FROM resume_work_experiences WHERE id = ? AND alumni_id = ?').get(Number(id), userRow.alumni_id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await req.json();
    const { company, position, location, start_year, end_year, is_current, description } = body;
    if (!company || !position || !start_year) return NextResponse.json({ error: '公司、职位、起始时间为必填项' }, { status: 400 });
    db.prepare(
      'UPDATE resume_work_experiences SET company=?, position=?, location=?, start_year=?, end_year=?, is_current=?, description=? WHERE id=?'
    ).run(company, position, location || null, start_year, is_current ? null : (end_year || null), is_current ? 1 : 0, description || null, Number(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const { id } = await params;
    const existing = db.prepare('SELECT * FROM resume_work_experiences WHERE id = ? AND alumni_id = ?').get(Number(id), userRow.alumni_id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    db.prepare('DELETE FROM resume_work_experiences WHERE id = ?').run(Number(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
