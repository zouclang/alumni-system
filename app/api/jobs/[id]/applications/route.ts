import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const { id } = await params;
    // Verify this job belongs to the current user
    const job = db.prepare('SELECT * FROM job_postings WHERE id = ? AND publisher_alumni_id = ?').get(Number(id), userRow.alumni_id);
    if (!job) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    // Mark all as read
    db.prepare("UPDATE job_applications SET is_read_by_publisher=1 WHERE job_id=? AND is_read_by_publisher=0").run(Number(id));
    // Trigger sidebar count update signal (not possible server-side, client will refresh)
    const apps = db.prepare(`
      SELECT ja.*, 
        a.name as applicant_name, a.gender, a.phone, a.wechat_id, a.company, a.position, a.industry, a.region,
        a.enrollment_year, a.graduation_year, a.college, a.major, a.degree
      FROM job_applications ja
      JOIN alumni a ON ja.applicant_alumni_id = a.id
      WHERE ja.job_id = ? AND ja.status = 'SUBMITTED'
      ORDER BY ja.created_at DESC
    `).all(Number(id));
    return NextResponse.json(apps);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
