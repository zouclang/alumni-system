import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const userId = session.userId;

    // Get alumni_id for the current user to check incoming requests
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(userId) as { alumni_id: number };
    const alumniId = userRow?.alumni_id;

    // 1. Processed outgoing requests (requester was notified = 0)
    const contactCount = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM contact_requests 
      WHERE requester_id = ? AND status != 'PENDING' AND user_notified = 0
    `).get(userId) as { count: number }).count;

    const correctionCount = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM correction_requests 
      WHERE requester_id = ? AND status != 'PENDING' AND user_notified = 0
    `).get(userId) as { count: number }).count;

    // 2. Pending incoming requests (requester is someone else, target is ME)
    let pendingIncomingCount = 0;
    if (alumniId) {
      pendingIncomingCount = (db.prepare(`
        SELECT COUNT(*) as count 
        FROM contact_requests 
        WHERE target_alumni_id = ? AND status = 'PENDING'
      `).get(alumniId) as { count: number }).count;
    }

    const processedTotal = contactCount + correctionCount;
    return NextResponse.json({ 
      count: processedTotal + pendingIncomingCount,
      processed: processedTotal,
      pendingIncoming: pendingIncomingCount
    });
  } catch (error) {
    console.error('GET /api/notifications/unread-count error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
