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
    
    // Auto-expire jobs past deadline
    db.prepare("UPDATE job_postings SET status='EXPIRED', updated_at=CURRENT_TIMESTAMP WHERE publisher_alumni_id=? AND status='ACTIVE' AND deadline < date('now')").run(userRow.alumni_id);
    
    const rows = db.prepare(`
      SELECT jp.*,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = jp.id AND status = 'SUBMITTED') as application_count,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = jp.id AND status = 'SUBMITTED' AND is_read_by_publisher = 0) as unread_count
      FROM job_postings jp
      WHERE jp.publisher_alumni_id = ?
      ORDER BY jp.created_at DESC
    `).all(userRow.alumni_id);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
