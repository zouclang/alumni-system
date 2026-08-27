import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const { id } = await params;
    const job = db.prepare("SELECT * FROM job_postings WHERE id = ? AND status = 'ACTIVE' AND deadline >= date('now')").get(Number(id)) as any;
    if (!job) return NextResponse.json({ error: '岗位不存在或已过期' }, { status: 400 });
    if (job.publisher_alumni_id === userRow.alumni_id) return NextResponse.json({ error: '不能投递自己发布的岗位' }, { status: 400 });
    const existing = db.prepare("SELECT id FROM job_applications WHERE job_id = ? AND applicant_alumni_id = ? AND status = 'SUBMITTED'").get(Number(id), userRow.alumni_id);
    if (existing) return NextResponse.json({ error: '已经投递过该岗位' }, { status: 400 });
    const body = await req.json();
    const { bio_snapshot } = body;
    db.prepare(`
      INSERT INTO job_applications (job_id, applicant_alumni_id, bio_snapshot, status, is_read_by_publisher, created_at, updated_at)
      VALUES (?, ?, ?, 'SUBMITTED', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(job_id, applicant_alumni_id) DO UPDATE SET
        bio_snapshot = excluded.bio_snapshot,
        status = 'SUBMITTED',
        is_read_by_publisher = 0,
        updated_at = CURRENT_TIMESTAMP
    `).run(Number(id), userRow.alumni_id, bio_snapshot || '');

    const appRow = db.prepare("SELECT id FROM job_applications WHERE job_id = ? AND applicant_alumni_id = ?").get(Number(id), userRow.alumni_id) as { id: number };

    return NextResponse.json({ success: true, applicationId: appRow?.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
