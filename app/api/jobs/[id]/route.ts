import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const { id } = await params;
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    const row = db.prepare(`
      SELECT jp.*, a.name as publisher_name
      FROM job_postings jp
      LEFT JOIN alumni a ON jp.publisher_alumni_id = a.id
      WHERE jp.id = ?
    `).get(Number(id)) as any;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Check if current user has applied
    let userApplied = false;
    let applicationId = null;
    if (userRow?.alumni_id) {
      const app = db.prepare("SELECT id FROM job_applications WHERE job_id = ? AND applicant_alumni_id = ? AND status = 'SUBMITTED'").get(Number(id), userRow.alumni_id) as any;
      userApplied = !!app;
      applicationId = app?.id || null;
    }
    return NextResponse.json({ ...row, userApplied, applicationId, currentAlumniId: userRow?.alumni_id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const { id } = await params;
    const existing = db.prepare('SELECT * FROM job_postings WHERE id = ? AND publisher_alumni_id = ?').get(Number(id), userRow.alumni_id);
    if (!existing) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    const body = await req.json();
    const { company_name, use_profile_company, is_alumni_company, job_title, job_type, location, salary_range, description, contact_info, tags, deadline } = body;
    if (!company_name || !job_title || !job_type || !location || !salary_range || !description || !contact_info || !deadline) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 });
    }
    const tagsStr = JSON.stringify(Array.isArray(tags) ? tags : []);
    const isAlumniCo = is_alumni_company !== false ? 1 : 0;
    db.prepare(`
      UPDATE job_postings SET company_name=?, use_profile_company=?, is_alumni_company=?, job_title=?, job_type=?, location=?, salary_range=?, description=?, contact_info=?, tags=?, deadline=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(company_name, use_profile_company ? 1 : 0, isAlumniCo, job_title, job_type, location, salary_range, description, contact_info, tagsStr, deadline, Number(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const { id } = await params;
    const existing = db.prepare('SELECT * FROM job_postings WHERE id = ? AND publisher_alumni_id = ?').get(Number(id), userRow.alumni_id);
    if (!existing) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    const body = await req.json();
    const { status } = body;
    if (!['WITHDRAWN', 'ACTIVE'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    db.prepare('UPDATE job_postings SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, Number(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
