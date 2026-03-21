import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(_request.url);
    const status = searchParams.get('status');
    const db = getDb();

    let query = `
      SELECT a.*, u.id as id, u.username, u.status, u.role, u.created_at, 
             a.id as alumni_id
      FROM users u
      LEFT JOIN alumni a ON u.alumni_id = a.id
    `;
    
    let params: any[] = [];
    if (status) {
      query += ' WHERE u.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY u.created_at DESC';

    const users = db.prepare(query).all(...params) as any[];

    // Fetch school experiences for each user if linked to an alumni record
    for (const u of users) {
      if (u.alumni_id) {
        const exps = db.prepare('SELECT * FROM school_experiences WHERE alumni_id = ? ORDER BY sort_order ASC').all(u.alumni_id);
        u.experiences = exps;
      } else {
        u.experiences = [];
      }
    }

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, status, role, removeCouncil } = await request.json();
    const db = getDb();

    if (removeCouncil) {
       // Just remove the association role from the linked alumni
       const user = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(userId) as any;
       if (user?.alumni_id) {
         db.prepare('UPDATE alumni SET association_role = NULL WHERE id = ?').run(user.alumni_id);
       }
       return NextResponse.json({ success: true });
    }

    if (status) {
      db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, userId);
      
      // If approved and has alumni_id, make sure alumni is also approved
      if (status === 'APPROVED') {
        const user = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(userId) as any;
        if (user?.alumni_id) {
          db.prepare('UPDATE alumni SET status = "APPROVED", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.alumni_id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
