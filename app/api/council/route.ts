import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    
        // Custom sort order based on user request:
    // 理事长、副理事长、理事、秘书长、副秘书长
    const query = `
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM users WHERE alumni_id = a.id) as is_registered,
        (
          SELECT json_group_array(
            json_object(
              'stage', stage,
              'start_year', start_year,
              'end_year', end_year,
              'college', college,
              'major', major,
              'is_public', is_public
            )
          )
          FROM (
            SELECT * FROM school_experiences 
            WHERE alumni_id = a.id 
            ORDER BY sort_order ASC
          )
        ) as experiences
      FROM alumni a
      WHERE a.association_role IS NOT NULL AND a.association_role != ''
      ORDER BY 
        CASE a.association_role
          WHEN '理事长' THEN 1
          WHEN '副理事长' THEN 2
          WHEN '理事' THEN 3
          WHEN '秘书长' THEN 4
          WHEN '副秘书长' THEN 5
          ELSE 99
        END ASC,
        a.enrollment_year ASC
    `;

    const rows = db.prepare(query).all().map((item: any) => ({
      ...item,
      experiences: JSON.parse(item.experiences || '[]')
    }));

    const isAdmin = session.role === 'ADMIN';
    const isCouncil = !!session.association_role;
    const isUser = !isAdmin && !isCouncil;

    const alumniIds = rows.map((r: any) => r.id);
    let approvedContactAlumniIds: Set<number> = new Set();
    
    if (alumniIds.length > 0) {
      const qs = alumniIds.map(() => '?').join(',');
      // Bidirectional check for council members:
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

    const data = rows.map((r: any) => {
      const isRecordApproved = approvedContactAlumniIds.has(r.id);
      const isSelf = r.id === session.alumniId;
      
      const alumniData = { ...r };

      if (isUser && !isRecordApproved && !isSelf) {
        // New Privacy Model Redaction
        const isRegistered = !!r.is_registered;

        // 1. Always Mask sensitive fields (Privacy by default for contact info)
        alumniData.phone = '******';
        alumniData.wechat_groups = '******';
        alumniData.qq = '******';
        alumniData.wechat_id = '******';
        alumniData.industry = '******';
        alumniData.social_roles = '******';
        alumniData.hometown = '******';
        alumniData.region = '******';
        alumniData.birth_month = '****';
        alumniData.interests = '******';
        alumniData.dut_verified = '******';

        // 2. Conditional Masking for Degree/Education
        if (isRegistered) {
          alumniData.degree = '******';
          // college/college_normalized/major are sensitive for registered if not in experiences
          // But for now, we follow the pattern that root education fields follow the same rule
          alumniData.college = '******';
          alumniData.college_normalized = '******';
          alumniData.major = '******';

          alumniData.experiences = (r.experiences || []).map((exp: any) => ({
            ...exp,
            stage: exp.is_public ? exp.stage : '******',
            start_year: exp.is_public ? exp.start_year : '****',
            end_year: exp.is_public ? exp.end_year : '****',
            college: exp.is_public ? exp.college : '******',
            major: exp.is_public ? exp.major : '******',
          }));
        } else {
          // Unregistered: Public by default (Education and Career)
          alumniData.experiences = r.experiences || [];
        }

        // 3. Conditional Masking for Company
        if (isRegistered && !r.is_company_public) alumniData.company = '******';

        // 4. Conditional Masking for Position
        if (isRegistered && !r.is_position_public) alumniData.position = '******';

        // 5. Conditional Masking for Business Desc
        if (isRegistered && !r.is_business_public) alumniData.business_desc = '******';

        alumniData.is_redacted = isRegistered;
      } else {
        alumniData.is_redacted = false;
      }

      return alumniData;
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Council API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
