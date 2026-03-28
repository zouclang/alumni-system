import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generatePinyin } from '@/lib/name-utils';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    
    // Updated permission: Admin and Council see all. 
    // Regular users can now enter detail pages for anyone, but data is masked.
    const isAdmin = session.role === 'ADMIN';
    const isCouncil = !!session.association_role;
    const isSelf = session.alumniId === parseInt(id);
    
    // Check if this record is approved for the current user
    const approvedConnection = db.prepare(`
      SELECT cr.id FROM contact_requests cr
      JOIN users u ON cr.requester_id = u.id
      WHERE cr.status = 'APPROVED'
      AND (
        (u.alumni_id = ? AND cr.target_alumni_id = ?)
        OR
        (cr.target_alumni_id = ? AND u.alumni_id = ?)
      )
    `).get(session.alumniId, id, session.alumniId, id);
    const isApproved = !!approvedConnection;

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

    const isRegistered = row.registration?.isRegistered;

    // 2. Comprehensive Masking for Unapproved Connections (Applying Reciprocal Logic)
    if (!isAdmin && !isSelf && !isApproved) {
      // Fetch viewer's own settings for reciprocal check (Admins and Council see all)
      const viewerId = session.alumniId;
      const viewer = viewerId ? db.prepare('SELECT is_company_public, is_position_public, is_business_public, is_social_roles_public, is_education_public FROM alumni WHERE id = ?').get(viewerId) as any : null;
      
      const isViewerCouncil = !!session.association_role;
      const bypassReciprocal = isViewerCouncil || isAdmin;

      if (isRegistered) {
        // Reciprocal checks: must BOTH have it public to see it (unless bypass)
        const canSeeCompany = bypassReciprocal || (row.is_company_public && viewer?.is_company_public);
        const canSeePosition = bypassReciprocal || (row.is_position_public && viewer?.is_position_public);
        const canSeeBusiness = bypassReciprocal || (row.is_business_public && viewer?.is_business_public);
        const canSeeSocial = bypassReciprocal || (row.is_social_roles_public && viewer?.is_social_roles_public);
        const canSeeEducation = bypassReciprocal || (row.is_education_public && viewer?.is_education_public);

        if (!canSeeCompany) row.company = '******';
        if (!canSeePosition) row.position = '******';
        if (!canSeeBusiness) row.business_desc = '******';
        if (!canSeeSocial) row.social_roles = '******';

        // Mask education if not reciprocal
        if (!canSeeEducation) {
          row.degree = '******';
          row.enrollment_year = '******';
          row.graduation_year = '******';
          row.college = '******';
          row.college_normalized = '******';
          row.major = '******';
          row.school_experience = '******';
          row.experiences = row.experiences.map((exp: any) => ({
            ...exp,
            stage: '******',
            start_year: '****',
            end_year: '****',
            college: '******',
            major: '******',
          }));
        } else {
          // If reciprocal Education is ON, still respect individual is_public toggles of the target
          row.experiences = row.experiences.map((exp: any) => ({
            ...exp,
            stage: exp.is_public ? exp.stage : '******',
            start_year: exp.is_public ? exp.start_year : '****',
            end_year: exp.is_public ? exp.end_year : '****',
            college: exp.is_public ? exp.college : '******',
            major: exp.is_public ? exp.major : '******',
          }));
        }
      }

      // Always mask sensitive contact info for non-connections
      row.phone = '******';
      row.wechat_id = '******';
      row.qq = '******';
      row.wechat_groups = '******';
      
      // Additional PII masking
      row.birth_month = '****';
      if (!isRegistered) {
        row.career_type = '******';
        row.major = '******';
      }
      
      row.is_redacted = true;
    } else {
      row.is_redacted = false;
    }

    // Interests: Only admins and self see this.
    if (!isAdmin && !isSelf) {
      row.interests = '******';
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
      is_company_public: body.is_company_public !== undefined ? (body.is_company_public ? 1 : 0) : 1,
      is_position_public: body.is_position_public !== undefined ? (body.is_position_public ? 1 : 0) : 1,
      is_business_public: body.is_business_public !== undefined ? (body.is_business_public ? 1 : 0) : 1,
      is_social_roles_public: body.is_social_roles_public !== undefined ? (body.is_social_roles_public ? 1 : 0) : 1,
      is_education_public: body.is_education_public !== undefined ? (body.is_education_public ? 1 : 0) : 1,
      wechat_groups: body.wechat_groups || null,
      association_role: body.association_role || null,
      pinyin_name: generatePinyin(body.name),
    };

    // Non-admins cannot change association_role
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
        social_roles = @social_roles, business_desc = @business_desc, wechat_groups = @wechat_groups, association_role = @association_role, pinyin_name = @pinyin_name, 
        is_company_public = @is_company_public, is_position_public = @is_position_public, is_business_public = @is_business_public, is_social_roles_public = @is_social_roles_public, is_education_public = @is_education_public,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    const deleteExp = db.prepare('DELETE FROM school_experiences WHERE alumni_id = ?');
    const insertExp = db.prepare(`
      INSERT INTO school_experiences (alumni_id, stage, start_year, end_year, college, major, sort_order, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let updated: any = null;

    const transaction = db.transaction((params, experiences) => {
      updateAlumni.run(params);
      deleteExp.run(params.id);
      
      if (Array.isArray(experiences)) {
        experiences.forEach((exp: any, i: number) => {
          insertExp.run(params.id, exp.stage || null, exp.start_year || null, exp.end_year || null, exp.college || null, exp.major || null, i, exp.is_public ? 1 : 0);
        });
      }
      
      updated = db.prepare('SELECT * FROM alumni WHERE id = ?').get(params.id);
      updated.experiences = db.prepare('SELECT * FROM school_experiences WHERE alumni_id = ? ORDER BY sort_order ASC').all(params.id);
    });

    transaction(p, body.experiences || []);

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
