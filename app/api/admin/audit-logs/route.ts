import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();

    // Combined query for audit logs
    // Types: MEMBER (User Registration), CONTACT (Contact Request), CORRECTION (Correction Request)
    const query = `
      SELECT 
        'MEMBER' as type,
        u.id as id,
        a.name as target_name,
        '' as requester_name,
        u.status as status,
        u.updated_at as updated_at,
        '' as remark
      FROM users u
      JOIN alumni a ON u.alumni_id = a.id
      WHERE u.status != 'PENDING' AND u.role != 'ADMIN'

      UNION ALL

      SELECT 
        'CONTACT' as type,
        cr.id as id,
        ta.name as target_name,
        ra.name as requester_name,
        cr.status as status,
        cr.updated_at as updated_at,
        cr.admin_remark as remark
      FROM contact_requests cr
      JOIN alumni ta ON cr.target_alumni_id = ta.id
      JOIN users ru ON cr.requester_id = ru.id
      JOIN alumni ra ON ru.alumni_id = ra.id
      WHERE cr.status != 'PENDING'

      UNION ALL

      SELECT 
        'CORRECTION' as type,
        cor.id as id,
        ta.name as target_name,
        ra.name as requester_name,
        cor.status as status,
        cor.updated_at as updated_at,
        cor.admin_remark as remark
      FROM correction_requests cor
      JOIN alumni ta ON cor.alumni_id = ta.id
      JOIN users ru ON cor.requester_id = ru.id
      JOIN alumni ra ON ru.alumni_id = ra.id
      WHERE cor.status != 'PENDING'

      ORDER BY updated_at DESC
    `;

    const logs = db.prepare(query).all();
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
