import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const jobType = searchParams.get('jobType') || '';
    const location = searchParams.get('location') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    let where = `jp.status = 'ACTIVE' AND jp.deadline >= date('now')`;
    const bindParams: any[] = [];

    if (search) {
      where += ` AND (jp.job_title LIKE ? OR jp.company_name LIKE ?)`;
      bindParams.push(`%${search}%`, `%${search}%`);
    }
    if (jobType) {
      where += ` AND jp.job_type = ?`;
      bindParams.push(jobType);
    }
    if (location) {
      where += ` AND jp.location LIKE ?`;
      bindParams.push(`%${location}%`);
    }

    const total = (db.prepare(`SELECT COUNT(*) as count FROM job_postings jp WHERE ${where}`).get(...bindParams) as { count: number }).count;
    const rows = db.prepare(`
      SELECT jp.*, a.name as publisher_name
      FROM job_postings jp
      LEFT JOIN alumni a ON jp.publisher_alumni_id = a.id
      WHERE ${where}
      ORDER BY jp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...bindParams, pageSize, offset);

    return NextResponse.json({ data: rows, total, page, pageSize });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const body = await req.json();
    const { company_name, use_profile_company, is_alumni_company, job_title, job_type, location, salary_range, description, contact_info, tags, deadline } = body;
    if (!company_name || !job_title || !job_type || !location || !salary_range || !description || !contact_info || !deadline) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 });
    }
    const tagsStr = JSON.stringify(Array.isArray(tags) ? tags : []);
    const isAlumniCo = is_alumni_company !== false ? 1 : 0;
    const result = db.prepare(`
      INSERT INTO job_postings (publisher_alumni_id, company_name, use_profile_company, is_alumni_company, job_title, job_type, location, salary_range, description, contact_info, tags, deadline, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `).run(userRow.alumni_id, company_name, use_profile_company ? 1 : 0, isAlumniCo, job_title, job_type, location, salary_range, description, contact_info, tagsStr, deadline);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
