import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generatePinyin, syncDuplicateStatus } from '@/lib/name-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    
    // Check permission: Admin and Council can see all. User can only see self.
    const isCouncilOrAdmin = session.role === 'ADMIN' || (session.role === 'USER' && !!session.association_role);
    if (!isCouncilOrAdmin && session.alumniId !== parseInt(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const row = db.prepare('SELECT * FROM alumni WHERE id = ?').get(id) as any;
    if (!row) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    
    row.experiences = db.prepare('SELECT * FROM school_experiences WHERE alumni_id = ? ORDER BY sort_order ASC').all(id);
    
    // Check if registered
    const user = db.prepare('SELECT id, status, role FROM users WHERE alumni_id = ?').get(id) as any;
    if (user) {
      row.registration = {
        isRegistered: true,
        userId: user.id,
        status: user.status,
        role: user.role
      };
    } else {
      row.registration = { isRegistered: false };
    }

    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    // Check permission: Admin can edit all. User can only edit self.
    const isAdmin = session.role === 'ADMIN';
    if (!isAdmin && session.alumniId !== parseInt(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();
    const body = await request.json();
    const experiences = Array.isArray(body.experiences) ? body.experiences : [];
    const firstExp = experiences[0] || {};

    const p = {
      id,
      name: body.name || null,
      has_duplicate_name: body.has_duplicate_name || null,
      hometown: body.hometown || null,
      school_experience: body.school_experience || null,
      // Mirror from first experience if scalar fields are missing
      enrollment_year: body.enrollment_year || firstExp.start_year || null,
      graduation_year: body.graduation_year || firstExp.end_year || null,
      college: body.college || firstExp.college || null,
      college_normalized: body.college_normalized || firstExp.college || null,
      major: body.major || firstExp.major || null,
      degree: body.degree || null,
      phone: body.phone || null,
      interests: body.interests || null,
      qq: body.qq || null,
      wechat_id: body.wechat_id || null,
      dut_verified: body.dut_verified || null,
      birth_month: body.birth_month || null,
      gender: body.gender || null,
      region: body.region || null,
      career_type: body.career_type || null,
      company: body.company || null,
      position: body.position || null,
      industry: body.industry || null,
      social_roles: body.social_roles || null,
      business_desc: body.business_desc || null,
      wechat_groups: body.wechat_groups || null,
      association_role: body.association_role || null,
      pinyin_name: generatePinyin(body.name),
    };

    // Non-admins cannot change association_role or status
    if (!isAdmin) {
      const current = db.prepare('SELECT association_role, status FROM alumni WHERE id = ?').get(id) as any;
      p.association_role = current?.association_role || null;
    }

    const updateAlumni = db.prepare(`
      UPDATE alumni SET
        name = @name, hometown = @hometown, school_experience = @school_experience,
        enrollment_year = @enrollment_year, graduation_year = @graduation_year,
        college = @college, college_normalized = @college_normalized, major = @major,
        degree = @degree, phone = @phone, interests = @interests, qq = @qq, wechat_id = @wechat_id,
        dut_verified = @dut_verified, birth_month = @birth_month,
        gender = @gender, region = @region, career_type = @career_type,
        company = @company, position = @position, industry = @industry,
        social_roles = @social_roles, business_desc = @business_desc, wechat_groups = @wechat_groups, association_role = @association_role, pinyin_name = @pinyin_name, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    const deleteExp = db.prepare('DELETE FROM school_experiences WHERE alumni_id = ?');
    const insertExp = db.prepare(`
      INSERT INTO school_experiences (alumni_id, stage, start_year, end_year, college, major, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let updated: any = null;

    const transaction = db.transaction((params, experiences) => {
      updateAlumni.run(params);
      deleteExp.run(params.id);
      
      if (Array.isArray(experiences)) {
        experiences.forEach((exp: any, i: number) => {
          insertExp.run(params.id, exp.stage || null, exp.start_year || null, exp.end_year || null, exp.college || null, exp.major || null, i);
        });
      }
      
      updated = db.prepare('SELECT * FROM alumni WHERE id = ?').get(params.id);
      updated.experiences = db.prepare('SELECT * FROM school_experiences WHERE alumni_id = ? ORDER BY sort_order ASC').all(params.id);
      
      // Sync duplicate status for the new name
      if (params.name) syncDuplicateStatus(db, params.name);
    });

    const oldName = db.prepare('SELECT name FROM alumni WHERE id = ?').get(id) as { name: string } | undefined;
    
    transaction(p, body.experiences || []);

    // If name changed, sync status for the old name too
    if (oldName?.name && oldName.name !== p.name) {
      syncDuplicateStatus(db, oldName.name);
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete records' }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();
    
    let deleted = false;
    const transaction = db.transaction(() => {
      // Re-order deletion to handle children first, avoiding FK constraint violations
      // 1. Delete requests that depend on users or the alumni themselves
      db.prepare('DELETE FROM contact_requests WHERE target_alumni_id = ? OR requester_id IN (SELECT id FROM users WHERE alumni_id = ?)').run(id, id);
      db.prepare('DELETE FROM correction_requests WHERE alumni_id = ? OR requester_id IN (SELECT id FROM users WHERE alumni_id = ?)').run(id, id);
      
      // 2. Delete experiences and user records
      db.prepare('DELETE FROM school_experiences WHERE alumni_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE alumni_id = ?').run(id);
      
      // 3. Finally delete the alumni record
      const res = db.prepare('DELETE FROM alumni WHERE id = ?').run(id);
      if (res.changes > 0) deleted = true;
    });
    
    transaction();
    
    if (!deleted) return NextResponse.json({ error: '未找到相关记录' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/alumni/[id] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
