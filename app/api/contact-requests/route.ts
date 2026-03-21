import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateProfileCompletion, COMPLETION_THRESHOLD, isProfileEligible } from '@/lib/profile-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = '';
    const params: any[] = [];

    if (session.role === 'ADMIN') {
      query = `
        SELECT cr.*, u.username as requester_username, a.name as target_name, u_alumni.name as requester_real_name
        FROM contact_requests cr
        JOIN users u ON cr.requester_id = u.id
        JOIN alumni a ON cr.target_alumni_id = a.id
        LEFT JOIN alumni u_alumni ON u.alumni_id = u_alumni.id
      `;
      if (status) {
        query += ' WHERE cr.status = ?';
        params.push(status);
      }
      query += ' ORDER BY cr.created_at DESC';
    } else {
      query = `
        SELECT cr.*, a.name as target_name, a.phone as target_phone, a.wechat_groups as target_wechat_group
        FROM contact_requests cr
        JOIN alumni a ON cr.target_alumni_id = a.id
        WHERE cr.requester_id = ?
      `;
      params.push(session.userId);
      if (status) {
        query += ' AND cr.status = ?';
        params.push(status);
      }
      query += ' ORDER BY cr.created_at DESC';
    }

    const requests = db.prepare(query).all(...params);
    return NextResponse.json(requests);
  } catch (error) {
    console.error('GET /api/contact-requests error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetAlumniId, reason } = body;

    if (!targetAlumniId || !reason) {
      return NextResponse.json({ error: 'Target alumni ID and reason are required' }, { status: 400 });
    }

    const db = getDb();
    
    // Check sender's profile completion (Exempt ADMIN)
    if (session.role !== 'ADMIN') {
      const senderAlumni = db.prepare(`
        SELECT a.* FROM alumni a
        JOIN users u ON u.alumni_id = a.id
        WHERE u.id = ?
      `).get(session.userId) as any;

      if (senderAlumni) {
        const experiences = db.prepare('SELECT * FROM school_experiences WHERE alumni_id = ?').all(senderAlumni.id);
        const eligibility = isProfileEligible(senderAlumni, experiences);
        
        if (!eligibility.eligible) {
          return NextResponse.json({ 
            error: eligibility.reason || '您的个人资料未达到申请要求。',
            completion: calculateProfileCompletion(senderAlumni, experiences)
          }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: '未找到您的校友档案，请先完善资料。' }, { status: 403 });
      }
    }

    // Check if already requested and pending/approved
    const existing = db.prepare(`
      SELECT * FROM contact_requests 
      WHERE requester_id = ? AND target_alumni_id = ? AND status IN ('PENDING', 'APPROVED')
    `).get(session.userId, targetAlumniId);

    if (existing) {
      return NextResponse.json({ error: 'You already have an active or approved request for this person' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO contact_requests (requester_id, target_alumni_id, reason)
      VALUES (?, ?, ?)
    `).run(session.userId, targetAlumniId, reason);

    const newRequest = db.prepare('SELECT * FROM contact_requests WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('POST /api/contact-requests error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
