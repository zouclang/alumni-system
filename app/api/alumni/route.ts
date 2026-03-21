import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { pinyin } from 'pinyin-pro';
import { getSession } from '@/lib/auth';

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
    const isUser = !isAdmin && !isCouncil;

    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // All registered users can browse now as per new requirement
    // Admins see all, others see only APPROVED alumni records
    if (!isAdmin) {
      conditions.push("status = 'APPROVED'");
    }

    if (search) {
      // Support searching by name, pinyin, company, position, phone, etc.
      conditions.push('(name LIKE ? OR pinyin_name LIKE ? OR company LIKE ? OR position LIKE ? OR phone LIKE ? OR qq LIKE ? OR wechat_id LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like, like);
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
    if (college) { conditions.push('college_normalized = ?'); params.push(college); }
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
    
    // For Admins, we JOIN with users to check registration status
    let query = '';
    if (isAdmin) {
      query = `
        SELECT a.*, u.status as user_status, (CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END) as is_registered
        FROM alumni a
        LEFT JOIN users u ON a.id = u.alumni_id
        ${where}
        ORDER BY a.pinyin_name ASC LIMIT ? OFFSET ?
      `;
    } else {
      query = `SELECT * FROM alumni a ${where} ORDER BY a.pinyin_name ASC LIMIT ? OFFSET ?`;
    }

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

    // Redaction logic for normal users
    let approvedContactAlumniIds: Set<number> = new Set();
    if (isUser && alumniIds.length > 0) {
      const qs = alumniIds.map(() => '?').join(',');
      const approvedRequests = db.prepare(`
        SELECT target_alumni_id 
        FROM contact_requests 
        WHERE requester_id = ? AND target_alumni_id IN (${qs}) AND status = 'APPROVED'
      `).all(session.userId, ...alumniIds) as any[];
      approvedContactAlumniIds = new Set(approvedRequests.map(r => r.target_alumni_id));
    }

    const data = rows.map((r: any) => {
      const isRecordApproved = approvedContactAlumniIds.has(r.id);
      const isSelf = r.id === session.alumniId;
      
      const alumniData = {
        ...r,
        experiences: expsMap[r.id] || []
      };

      if (isUser && !isRecordApproved && !isSelf) {
        // Redaction: Hide phone and wechat_groups
        alumniData.phone = '******';
        alumniData.wechat_groups = '******';
        alumniData.qq = '******';
        alumniData.wechat_id = '******';
        alumniData.is_redacted = true;
      } else {
        alumniData.is_redacted = false;
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

    const p = {
      name: body.name || null,
      has_duplicate_name: body.has_duplicate_name || null,
      hometown: body.hometown || null,
      school_experience: body.school_experience || null,
      enrollment_year: body.enrollment_year || null,
      graduation_year: body.graduation_year || null,
      college: body.college || null,
      college_normalized: body.college_normalized || null,
      major: body.major || null,
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
      pinyin_name: body.name ? pinyin(body.name, { toneType: 'none', type: 'array', nonZh: 'consecutive' }).join('') : null,
    };

    const insertAlumni = db.prepare(`
      INSERT INTO alumni (
        name, has_duplicate_name, hometown, school_experience,
        enrollment_year, graduation_year, college, college_normalized, major,
        degree, phone, interests, qq, wechat_id, dut_verified, birth_month,
        gender, region, career_type, company, position, industry, social_roles, business_desc, wechat_groups, pinyin_name, association_role
      ) VALUES (
        @name, @has_duplicate_name, @hometown, @school_experience,
        @enrollment_year, @graduation_year, @college, @college_normalized, @major,
        @degree, @phone, @interests, @qq, @wechat_id, @dut_verified, @birth_month,
        @gender, @region, @career_type, @company, @position, @industry, @social_roles, @business_desc, @wechat_groups, @pinyin_name, @association_role
      )
    `);

    const insertExp = db.prepare(`
      INSERT INTO school_experiences (alumni_id, stage, start_year, end_year, college, major, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let newRecord: any = null;

    const transaction = db.transaction((params, experiences) => {
      const result = insertAlumni.run(params);
      const alumniId = result.lastInsertRowid;
      
      if (Array.isArray(experiences)) {
        experiences.forEach((exp: any, i: number) => {
          insertExp.run(alumniId, exp.stage || null, exp.start_year || null, exp.end_year || null, exp.college || null, exp.major || null, i);
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

