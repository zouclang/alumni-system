import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const db = getDb();
    const rows = db.prepare(`
      SELECT cr.*, 
             a.name as target_name,
             u.username as requester_username,
             (SELECT name FROM alumni WHERE id = u.alumni_id) as requester_real_name
      FROM correction_requests cr
      JOIN alumni a ON cr.alumni_id = a.id
      JOIN users u ON cr.requester_id = u.id
      WHERE cr.status = ?
      ORDER BY cr.created_at DESC
    `).all(status);

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { alumniId, content } = body;

    if (!alumniId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    
    // Check if user has permission to correct info
    // Council members can correct anyone. Normal users only if they have approved contact request or it's self.
    const isCouncilOrAdmin = session.role === 'ADMIN' || (session.role === 'USER' && !!session.association_role);
    let canCorrect = isCouncilOrAdmin || session.alumniId === parseInt(alumniId);
    
    if (!canCorrect) {
      const approved = db.prepare('SELECT id FROM contact_requests WHERE requester_id = ? AND target_alumni_id = ? AND status = "APPROVED"').get(session.userId, alumniId);
      if (approved) canCorrect = true;
    }

    if (!canCorrect) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    db.prepare(`
      INSERT INTO correction_requests (alumni_id, requester_id, content)
      VALUES (?, ?, ?)
    `).run(alumniId, session.userId, content);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
