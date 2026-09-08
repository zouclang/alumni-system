import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ profile: null });

  const db = getDb();
  const app = db.prepare(`SELECT status FROM matchmaking_applications WHERE alumni_id = ?`).get(session.alumniId) as any;
  if (!app || app.status !== 'APPROVED') return NextResponse.json({ error: '未加入喜结连理' }, { status: 403 });

  const profile = db.prepare('SELECT * FROM matchmaking_profiles WHERE alumni_id = ?').get(session.alumniId) as any;
  if (!profile) {
    const alumni = db.prepare('SELECT gender, region, degree, birth_month FROM alumni WHERE id = ?').get(session.alumniId) as any;
    const currentYear = new Date().getFullYear();
    const age = alumni?.birth_month ? currentYear - Math.floor(alumni.birth_month / 100) : null;
    return NextResponse.json({ profile: alumni ? { gender: alumni.gender, region: alumni.region, degree: alumni.degree, age, profile_completed: 0, hobbies: '[]', personality: '[]', parents_job: '[]' } : null });
  }
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ error: '未绑定校友信息' }, { status: 400 });

  const db = getDb();
  const app = db.prepare(`SELECT status FROM matchmaking_applications WHERE alumni_id = ?`).get(session.alumniId) as any;
  if (!app || app.status !== 'APPROVED') return NextResponse.json({ error: '未加入喜结连理' }, { status: 403 });

  const body = await req.json();
  const { gender, age, height, weight, hometown, marital_status, region, property_status, annual_income, job_type, degree, parents_job, parents_insurance, family_structure, parents_marital, smoking, drinking, schedule, hobbies, personality } = body;

  if (!age || !height || !marital_status) return NextResponse.json({ error: '年龄、身高、婚姻状况为必填项' }, { status: 400 });

  const j = (v: any) => JSON.stringify(Array.isArray(v) ? v : []);
  const existing = db.prepare('SELECT id FROM matchmaking_profiles WHERE alumni_id = ?').get(session.alumniId);

  if (existing) {
    db.prepare(`UPDATE matchmaking_profiles SET gender=?,age=?,height=?,weight=?,hometown=?,marital_status=?,region=?,property_status=?,annual_income=?,job_type=?,degree=?,parents_job=?,parents_insurance=?,family_structure=?,parents_marital=?,smoking=?,drinking=?,schedule=?,hobbies=?,personality=?,profile_completed=1,is_active=1,updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`)
      .run(gender,age,height,weight,hometown,marital_status,region,property_status,annual_income,job_type,degree,j(parents_job),parents_insurance,family_structure,parents_marital,smoking,drinking,schedule,j(hobbies),j(personality),session.alumniId);
  } else {
    db.prepare(`INSERT INTO matchmaking_profiles (alumni_id,gender,age,height,weight,hometown,marital_status,region,property_status,annual_income,job_type,degree,parents_job,parents_insurance,family_structure,parents_marital,smoking,drinking,schedule,hobbies,personality,profile_completed) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`)
      .run(session.alumniId,gender,age,height,weight,hometown,marital_status,region,property_status,annual_income,job_type,degree,j(parents_job),parents_insurance,family_structure,parents_marital,smoking,drinking,schedule,j(hobbies),j(personality));
  }

  // Sync back to alumni table
  if (gender || region || degree) {
    db.prepare(`UPDATE alumni SET gender=COALESCE(?,gender), region=COALESCE(?,region), degree=COALESCE(?,degree), updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(gender||null, region||null, degree||null, session.alumniId);
  }
  return NextResponse.json({ success: true });
}
