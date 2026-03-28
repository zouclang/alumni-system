import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generatePinyin } from '@/lib/name-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    const isAdmin = session.role === 'ADMIN';
    const isCouncil = !!session.association_role;

    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // All registered users can browse now as per new requirement
    // Admins see all, others see only APPROVED alumni records 
    // OR records that have an APPROVED user account
    if (!isAdmin) {
      conditions.push("(a.status = 'APPROVED' OR EXISTS (SELECT 1 FROM users u WHERE u.alumni_id = a.id AND u.status = 'APPROVED'))");
    }

    if (search) {
      // Support searching by name, pinyin, or company only for regular users
      conditions.push('(name LIKE ? OR pinyin_name LIKE ? OR company LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const region = searchParams.get('region') || '';
    const college = searchParams.get('college') || '';
    const degree = searchParams.get('degree') || '';
    const gender = searchParams.get('gender') || '';
    const careerType = searchParams.get('careerType') || '';
    const enrollmentYear = searchParams.get('enrollmentYear') || '';
    const wechatGroup = searchParams.get('wechatGroup') || '';
    const registered = searchParams.get('registered') || '';

    if (region) { conditions.push('region = ?'); params.push(region); }
    if (college) { 
      conditions.push('(college_normalized = ? OR EXISTS (SELECT 1 FROM school_experiences WHERE alumni_id = a.id AND college = ?))'); 
      params.push(college, college); 
    }
    if (degree) { conditions.push('degree LIKE ?'); params.push(`%${degree}%`); }
    if (gender) { conditions.push('gender = ?'); params.push(gender); }
    if (careerType) { conditions.push('career_type = ?'); params.push(careerType); }
    if (enrollmentYear) { conditions.push('enrollment_year = ?'); params.push(enrollmentYear); }
    if (wechatGroup) { conditions.push("(',' || wechat_groups || ',') LIKE ?"); params.push(`%,${wechatGroup},%`); }
    
    if (registered === 'yes') {
      conditions.push('EXISTS (SELECT 1 FROM users WHERE alumni_id = a.id)');
    } else if (registered === 'no') {
      conditions.push('NOT EXISTS (SELECT 1 FROM users WHERE alumni_id = a.id)');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (db.prepare(`SELECT COUNT(*) as count FROM alumni a ${where}`).get(...params) as { count: number }).count;
    
    let query = `
      SELECT a.*, u.status as user_status, (CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END) as is_registered
      FROM alumni a
      LEFT JOIN users u ON a.id = u.alumni_id
      ${where}
      ORDER BY a.pinyin_name ASC LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(query).all(...params, pageSize, offset);

    // Fetch related school experiences
    const alumniIds = rows.map((r: any) => r.id);
    const expsMap: Record<number, any[]> = {};
    
    if (alumniIds.length > 0) {
      const qs = alumniIds.map(() => '?').join(',');
      const exps = db.prepare(`SELECT * FROM school_experiences WHERE alumni_id IN (${qs}) ORDER BY sort_order ASC`).all(...alumniIds);
      for (const e of exps as any[]) {
        if (!expsMap[e.alumni_id]) expsMap[e.alumni_id] = [];
        expsMap[e.alumni_id].push(e);
      }
    }

    // Connection checks
    let approvedContactAlumniIds: Set<number> = new Set();
    if (alumniIds.length > 0) {
      const qs = alumniIds.map(() => '?').join(',');
      const approvedRequests = db.prepare(`
        SELECT 
          CASE 
            WHEN u.alumni_id = ? THEN cr.target_alumni_id 
            ELSE u.alumni_id 
          END as connected_id
        FROM contact_requests cr
        JOIN users u ON cr.requester_id = u.id
        WHERE cr.status = 'APPROVED'
        AND (
          (u.alumni_id = ? AND cr.target_alumni_id IN (${qs}))
          OR
          (cr.target_alumni_id = ? AND u.alumni_id IN (${qs}))
        )
      `).all(session.alumniId, session.alumniId, ...alumniIds, session.alumniId, ...alumniIds) as any[];
      approvedContactAlumniIds = new Set(approvedRequests.map(r => r.connected_id));
    }

    // Fetch viewer's own settings for reciprocal check (Admins and Council bypass)
    const viewerId = session.alumniId;
    const viewer = viewerId ? db.prepare('SELECT is_company_public, is_position_public, is_business_public, is_social_roles_public, is_education_public FROM alumni WHERE id = ?').get(viewerId) as any : null;
    const isViewerCouncil = !!session.association_role;
    const bypassReciprocal = isViewerCouncil || isAdmin;

    const data = rows.map((r: any) => {
      const isRecordApproved = approvedContactAlumniIds.has(r.id);
      
      const alumniData = {
        ...r,
        experiences: expsMap[r.id] || []
      };

      const isRegistered = !!r.is_registered;

      // Reciprocal/Connection-based Masking
      if (!isAdmin && session.alumniId !== r.id && !isRecordApproved) {
        if (isRegistered) {
          // Reciprocal checks
          const canSeeCompany = bypassReciprocal || (alumniData.is_company_public && viewer?.is_company_public);
          const canSeePosition = bypassReciprocal || (alumniData.is_position_public && viewer?.is_position_public);
          const canSeeBusiness = bypassReciprocal || (alumniData.is_business_public && viewer?.is_business_public);
          const canSeeSocial = bypassReciprocal || (alumniData.is_social_roles_public && viewer?.is_social_roles_public);
          const canSeeEducation = bypassReciprocal || (alumniData.is_education_public && viewer?.is_education_public);

          if (!canSeeCompany) alumniData.company = '******';
          if (!canSeePosition) alumniData.position = '******';
          if (!canSeeBusiness) alumniData.business_desc = '******';
          if (!canSeeSocial) alumniData.social_roles = '******';
          
          if (!canSeeEducation) {
            alumniData.degree = '******';
            alumniData.enrollment_year = '******';
            alumniData.graduation_year = '******';
            alumniData.college = '******';
            alumniData.college_normalized = '******';
            alumniData.major = '******';
            alumniData.experiences = (expsMap[r.id] || []).map(() => ({
              stage: '******',
              start_year: '****',
              end_year: '****',
              college: '******',
              major: '******',
            }));
          } else {
            // Reciprocal is ON, respect individual target toggles
            alumniData.experiences = (expsMap[r.id] || []).map(exp => ({
              ...exp,
              stage: exp.is_public ? exp.stage : '******',
              start_year: exp.is_public ? exp.start_year : '****',
              end_year: exp.is_public ? exp.end_year : '****',
              college: exp.is_public ? exp.college : '******',
              major: exp.is_public ? exp.major : '******',
            }));
          }
        }

        // Sensitive contact/PII fields always masked for non-connections
        alumniData.phone = '******';
        alumniData.wechat_id = '******';
        alumniData.qq = '******';
        alumniData.birth_month = '******';
        alumniData.interests = '******';
        alumniData.dut_verified = '******';
        alumniData.wechat_groups = '******';
        alumniData.hometown = '******';
        alumniData.region = '******';

        alumniData.is_redacted = true;
      } else {
        alumniData.is_redacted = false;
        alumniData.experiences = expsMap[r.id] || [];
      }

      // Interests: Only admins and self see this in list view
      if (!isAdmin && session.alumniId !== r.id) {
        alumniData.interests = '******';
      }

      return alumniData;
    });

    return NextResponse.json({ total, page, pageSize, data });
  } catch (error) {
    console.error('GET /api/alumni error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create records directly' }, { status: 403 });
    }

    const db = getDb();
    const body = await request.json();
    const experiences = Array.isArray(body.experiences) ? body.experiences : [];
    const firstExp = experiences[0] || {};

    const p = {
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
      wechat_groups: body.wechat_groups || null,
      association_role: body.association_role || null,
      pinyin_name: body.name ? generatePinyin(body.name) : null,
      is_company_public: body.is_company_public !== undefined ? (body.is_company_public ? 1 : 0) : 1,
      is_position_public: body.is_position_public !== undefined ? (body.is_position_public ? 1 : 0) : 1,
      is_business_public: body.is_business_public !== undefined ? (body.is_business_public ? 1 : 0) : 1,
      is_social_roles_public: body.is_social_roles_public !== undefined ? (body.is_social_roles_public ? 1 : 0) : 1,
      is_education_public: body.is_education_public !== undefined ? (body.is_education_public ? 1 : 0) : 1,
    };

    const insertAlumni = db.prepare(`
      INSERT INTO alumni (
        name, hometown, school_experience,
        enrollment_year, graduation_year, college, college_normalized, major,
        degree, phone, interests, qq, wechat_id, dut_verified, birth_month,
        gender, region, career_type, company, position, industry, social_roles, business_desc, wechat_groups, pinyin_name, association_role,
        is_company_public, is_position_public, is_business_public, is_social_roles_public, is_education_public
      ) VALUES (
        @name, @hometown, @school_experience,
        @enrollment_year, @graduation_year, @college, @college_normalized, @major,
        @degree, @phone, @interests, @qq, @wechat_id, @dut_verified, @birth_month,
        @gender, @region, @career_type, @company, @position, @industry, @social_roles, @business_desc, @wechat_groups, @pinyin_name, @association_role,
        @is_company_public, @is_position_public, @is_business_public, @is_social_roles_public, @is_education_public
      )
    `);

    const insertExp = db.prepare(`
      INSERT INTO school_experiences (alumni_id, stage, start_year, end_year, college, major, sort_order, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let newRecord: any = null;

    const transaction = db.transaction((params, experiences) => {
      const result = insertAlumni.run(params);
      const alumniId = result.lastInsertRowid;
      
      if (Array.isArray(experiences)) {
        experiences.forEach((exp: any, i: number) => {
          insertExp.run(alumniId, exp.stage || null, exp.start_year || null, exp.end_year || null, exp.college || null, exp.major || null, i, exp.is_public ? 1 : 0);
        });
      }
      
      newRecord = db.prepare('SELECT * FROM alumni WHERE id = ?').get(alumniId);
      newRecord.experiences = db.prepare('SELECT * FROM school_experiences WHERE alumni_id = ? ORDER BY sort_order ASC').all(alumniId);
    });

    transaction(p, body.experiences || []);

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error('POST /api/alumni error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
