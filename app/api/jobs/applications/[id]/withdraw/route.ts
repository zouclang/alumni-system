import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const { id } = await params;
    const app = db.prepare('SELECT * FROM job_applications WHERE id = ? AND applicant_alumni_id = ?').get(Number(id), userRow.alumni_id);
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    db.prepare("UPDATE job_applications SET status='WITHDRAWN', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(Number(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
