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
        (
          SELECT json_group_array(
            json_object(
              'stage', stage,
              'start_year', start_year,
              'end_year', end_year,
              'college', college,
              'major', major
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
      
      const alumniData = { ...r };

      if (isUser && !isRecordApproved && !isSelf) {
        // Redaction
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

    return NextResponse.json(data);
  } catch (error) {
    console.error('Council API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
