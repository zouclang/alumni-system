import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
      SELECT 
        u.id as id,
        u.id as user_id,
        u.username,
        u.status as status,
        u.status as user_status,
        u.role as role,
        u.created_at as created_at,
        a.id as alumni_id,
        a.name,
        a.gender,
        a.hometown,
        a.birth_month,
        a.region,
        a.enrollment_year,
        a.graduation_year,
        a.college,
        a.college_normalized,
        a.major,
        a.degree,
        a.phone,
        a.wechat_id,
        a.qq,
        a.company,
        a.position,
        a.industry,
        a.career_type,
        a.social_roles,
        a.business_desc,
        a.association_role,
        a.dut_verified
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
       const user = db.prepare('SELECT alumni_id FROM users WHERE id = ? OR alumni_id = ?').get(userId, userId) as any;
       if (user?.alumni_id) {
         db.prepare('UPDATE alumni SET association_role = NULL WHERE id = ?').run(user.alumni_id);
       }
       return NextResponse.json({ success: true });
    }

    if (status) {
      const targetUser = db.prepare('SELECT id, alumni_id FROM users WHERE id = ? OR alumni_id = ?').get(userId, userId) as any;
      if (targetUser) {
        db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, targetUser.id);
        if (targetUser.alumni_id) {
          db.prepare('UPDATE alumni SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, targetUser.alumni_id);
        }
      } else {
        db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, userId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
