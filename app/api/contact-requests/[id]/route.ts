import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status, adminRemark } = await request.json();
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT target_alumni_id FROM contact_requests WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Allow ADMIN or Target Alumni
    if (session.role !== 'ADMIN' && session.alumniId !== existing.target_alumni_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const result = db.prepare(`
      UPDATE contact_requests 
      SET status = ?, admin_remark = ?, processed_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, adminRemark || null, session.userId, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/contact-requests/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
