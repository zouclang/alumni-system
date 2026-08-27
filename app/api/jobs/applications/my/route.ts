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
    if (!userRow?.alumni_id) return NextResponse.json([]);
    const rows = db.prepare(`
      SELECT ja.*, jp.job_title, jp.company_name, jp.location, jp.job_type, jp.salary_range, jp.status as job_status, jp.deadline
      FROM job_applications ja
      JOIN job_postings jp ON ja.job_id = jp.id
      WHERE ja.applicant_alumni_id = ?
      ORDER BY ja.created_at DESC
    `).all(userRow.alumni_id);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
