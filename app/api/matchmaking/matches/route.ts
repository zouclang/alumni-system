import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { meetsTheirCriteria, maskName, parseJ } from '@/lib/matchmaking';

export const dynamic = 'force-dynamic';

function getConnectionStatus(db: any, myAlumniId: number, theirAlumniId: number) {
  const myReq = db.prepare(`SELECT * FROM matchmaking_connections WHERE applicant_alumni_id=? AND target_alumni_id=?`).get(myAlumniId, theirAlumniId) as any;
  const theirReq = db.prepare(`SELECT * FROM matchmaking_connections WHERE applicant_alumni_id=? AND target_alumni_id=?`).get(theirAlumniId, myAlumniId) as any;
  const approved = (myReq?.status === 'APPROVED') || (theirReq?.status === 'APPROVED');
  return { myRequest: myReq || null, theirRequest: theirReq || null, approved };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ matches: [] });

  const db = getDb();
  const app = db.prepare(`SELECT status FROM matchmaking_applications WHERE alumni_id = ?`).get(session.alumniId) as any;
  if (!app || app.status !== 'APPROVED') return NextResponse.json({ error: '未加入喜结连理' }, { status: 403 });

  const type = req.nextUrl.searchParams.get('type') || 'mutual';

  const myProfile = db.prepare('SELECT * FROM matchmaking_profiles WHERE alumni_id = ?').get(session.alumniId) as any;
  const myCriteria = db.prepare('SELECT * FROM matchmaking_criteria WHERE alumni_id = ?').get(session.alumniId) as any;

  if (!myProfile || !myProfile.profile_completed) return NextResponse.json({ matches: [], reason: 'incomplete_profile' });

  // Get opposite gender
  const oppositeGender = myProfile.gender === 'M' ? 'F' : (myProfile.gender === 'F' ? 'M' : null);

  // Get all active approved members with profiles
  const membersQuery = oppositeGender
    ? `SELECT mp.*, a.name, a.phone, a.wechat_id FROM matchmaking_profiles mp JOIN alumni a ON a.id=mp.alumni_id JOIN matchmaking_applications ma ON ma.alumni_id=mp.alumni_id WHERE ma.status='APPROVED' AND mp.is_active=1 AND mp.profile_completed=1 AND mp.alumni_id!=? AND mp.gender=?`
    : `SELECT mp.*, a.name, a.phone, a.wechat_id FROM matchmaking_profiles mp JOIN alumni a ON a.id=mp.alumni_id JOIN matchmaking_applications ma ON ma.alumni_id=mp.alumni_id WHERE ma.status='APPROVED' AND mp.is_active=1 AND mp.profile_completed=1 AND mp.alumni_id!=?`;

  const members = oppositeGender
    ? db.prepare(membersQuery).all(session.alumniId, oppositeGender) as any[]
    : db.prepare(membersQuery).all(session.alumniId) as any[];

  const results: any[] = [];

  for (const them of members) {
    const theirCriteria = db.prepare('SELECT * FROM matchmaking_criteria WHERE alumni_id = ?').get(them.alumni_id) as any;
    const iMeetTheirs = meetsTheirCriteria(myProfile, theirCriteria);
    const theyMeetMine = meetsTheirCriteria(them, myCriteria);

    let include = false;
    if (type === 'mutual') include = iMeetTheirs && theyMeetMine;
    else if (type === 'them') include = theyMeetMine && !iMeetTheirs;
    else if (type === 'me') include = iMeetTheirs && !theyMeetMine;

    if (!include) continue;

    const conn = getConnectionStatus(db, session.alumniId, them.alumni_id);
    const showContact = type === 'mutual' || conn.approved;

    results.push({
      alumni_id: them.alumni_id,
      name: them.name,
      display_name: showContact ? them.name : maskName(them.name),
      gender: them.gender,
      age: them.age,
      height: them.height,
      weight: them.weight,
      region: them.region,
      degree: them.degree,
      job_type: them.job_type,
      marital_status: them.marital_status,
      hobbies: parseJ(them.hobbies),
      personality: parseJ(them.personality),
      smoking: them.smoking,
      drinking: them.drinking,
      schedule: them.schedule,
      hometown: them.hometown,
      property_status: them.property_status,
      annual_income: them.annual_income,
      family_structure: them.family_structure,
      parents_marital: them.parents_marital,
      phone: showContact ? them.phone : null,
      wechat_id: showContact ? them.wechat_id : null,
      connection: conn,
    });
  }

  return NextResponse.json({ matches: results });
}
