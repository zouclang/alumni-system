import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const userId = session.userId;

    // Mark all processed requests as read for this user
    db.prepare(`
      UPDATE contact_requests 
      SET user_notified = 1 
      WHERE requester_id = ? AND status != 'PENDING'
    `).run(userId);

    db.prepare(`
      UPDATE correction_requests 
      SET user_notified = 1 
      WHERE requester_id = ? AND status != 'PENDING'
    `).run(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/notifications/mark-read error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
