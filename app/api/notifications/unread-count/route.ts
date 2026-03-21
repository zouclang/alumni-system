import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const userId = session.userId;

    // Count APPROVED or REJECTED requests that haven't been notified to the user
    // Note: status != 'PENDING' covers both APPROVED and REJECTED
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

    return NextResponse.json({ count: contactCount + correctionCount });
  } catch (error) {
    console.error('GET /api/notifications/unread-count error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
