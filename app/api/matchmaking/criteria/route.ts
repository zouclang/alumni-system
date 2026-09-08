import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ criteria: null });

  const db = getDb();
  const app = db.prepare(`SELECT status FROM matchmaking_applications WHERE alumni_id = ?`).get(session.alumniId) as any;
  if (!app || app.status !== 'APPROVED') return NextResponse.json({ error: '未加入喜结连理' }, { status: 403 });

  const criteria = db.prepare('SELECT * FROM matchmaking_criteria WHERE alumni_id = ?').get(session.alumniId);
  return NextResponse.json({ criteria: criteria || null });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ error: '未绑定校友信息' }, { status: 400 });

  const db = getDb();
  const app = db.prepare(`SELECT status FROM matchmaking_applications WHERE alumni_id = ?`).get(session.alumniId) as any;
  if (!app || app.status !== 'APPROVED') return NextResponse.json({ error: '未加入喜结连理' }, { status: 403 });

  const body = await req.json();
  const { age_min,age_max,height_min,height_max,weight_min,weight_max,income_min,income_max,marital_status,region,property_status,job_type,degree,parents_job,parents_insurance,family_structure,parents_marital,smoking,drinking,schedule,hobbies,personality } = body;

  const j = (v: any) => JSON.stringify(Array.isArray(v) ? v : []);
  const existing = db.prepare('SELECT id FROM matchmaking_criteria WHERE alumni_id = ?').get(session.alumniId);

  if (existing) {
    db.prepare(`UPDATE matchmaking_criteria SET age_min=?,age_max=?,height_min=?,height_max=?,weight_min=?,weight_max=?,income_min=?,income_max=?,marital_status=?,region=?,property_status=?,job_type=?,degree=?,parents_job=?,parents_insurance=?,family_structure=?,parents_marital=?,smoking=?,drinking=?,schedule=?,hobbies=?,personality=?,criteria_completed=1,updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`)
      .run(age_min||null,age_max||null,height_min||null,height_max||null,weight_min||null,weight_max||null,income_min||null,income_max||null,j(marital_status),j(region),j(property_status),j(job_type),degree||null,j(parents_job),parents_insurance||null,family_structure||null,parents_marital||null,smoking||null,drinking||null,schedule||null,j(hobbies),j(personality),session.alumniId);
  } else {
    db.prepare(`INSERT INTO matchmaking_criteria (alumni_id,age_min,age_max,height_min,height_max,weight_min,weight_max,income_min,income_max,marital_status,region,property_status,job_type,degree,parents_job,parents_insurance,family_structure,parents_marital,smoking,drinking,schedule,hobbies,personality,criteria_completed) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`)
      .run(session.alumniId,age_min||null,age_max||null,height_min||null,height_max||null,weight_min||null,weight_max||null,income_min||null,income_max||null,j(marital_status),j(region),j(property_status),j(job_type),degree||null,j(parents_job),parents_insurance||null,family_structure||null,parents_marital||null,smoking||null,drinking||null,schedule||null,j(hobbies),j(personality));
  }
  return NextResponse.json({ success: true });
}
