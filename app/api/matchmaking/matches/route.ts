import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function parseJ(v: any): string[] {
  if (!v) return [];
  try { const r = JSON.parse(v); return Array.isArray(r) ? r : []; } catch { return []; }
}

function maskName(name: string): string {
  if (!name) return '**';
  if (name.length === 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}

function inRange(val: number | null, min: number | null, max: number | null): boolean {
  if (val === null) return true; // if we don't know, treat as ok
  if (min !== null && val < min) return false;
  if (max !== null && val > max) return false;
  return true;
}

function arrAccepts(myVal: string | null, theirArr: string[]): boolean {
  if (!theirArr || theirArr.length === 0) return true; // no preference
  if (!myVal) return true; // we don't know, treat as ok
  return theirArr.includes(myVal);
}

function arrIntersects(myArr: string[], theirArr: string[]): boolean {
  if (!theirArr || theirArr.length === 0) return true;
  if (!myArr || myArr.length === 0) return true;
  return myArr.some(v => theirArr.includes(v));
}

function smokeAccepts(myVal: string | null, theirPref: string | null): boolean {
  if (!theirPref || theirPref === '不限') return true;
  if (!myVal) return true;
  if (theirPref === '不吸烟') return myVal === '不吸烟';
  if (theirPref === '可接受偶尔') return myVal === '不吸烟' || myVal === '偶尔';
  return true;
}

function drinkAccepts(myVal: string | null, theirPref: string | null): boolean {
  if (!theirPref || theirPref === '不限') return true;
  if (!myVal) return true;
  if (theirPref === '不喝酒') return myVal === '不喝酒';
  if (theirPref === '可接受偶尔') return myVal === '不喝酒' || myVal === '偶尔小酌';
  return true;
}

function scheduleAccepts(myVal: string | null, theirPref: string | null): boolean {
  if (!theirPref || theirPref === '不限') return true;
  if (!myVal) return true;
  if (theirPref === '规律') return myVal === '规律（早睡早起）';
  if (theirPref === '基本规律即可') return myVal === '规律（早睡早起）' || myVal === '基本规律';
  return true;
}

function degreeRank(d: string | null): number {
  const map: Record<string, number> = { '大专': 1, '本科': 2, '硕士': 3, '博士': 4 };
  return d ? (map[d] || 0) : 0;
}

// Does myProfile satisfy theirCriteria?
function meetsTheirCriteria(myProfile: any, theirCriteria: any): boolean {
  if (!theirCriteria) return true;
  if (!inRange(myProfile.age, theirCriteria.age_min, theirCriteria.age_max)) return false;
  if (!inRange(myProfile.height, theirCriteria.height_min, theirCriteria.height_max)) return false;
  if (!inRange(myProfile.weight, theirCriteria.weight_min, theirCriteria.weight_max)) return false;
  if (!inRange(myProfile.annual_income, theirCriteria.income_min, theirCriteria.income_max)) return false;
  if (!arrAccepts(myProfile.marital_status, parseJ(theirCriteria.marital_status))) return false;
  if (!arrAccepts(myProfile.property_status, parseJ(theirCriteria.property_status))) return false;
  if (!arrAccepts(myProfile.job_type, parseJ(theirCriteria.job_type))) return false;
  if (theirCriteria.degree && degreeRank(myProfile.degree) < degreeRank(theirCriteria.degree)) return false;
  if (!smokeAccepts(myProfile.smoking, theirCriteria.smoking)) return false;
  if (!drinkAccepts(myProfile.drinking, theirCriteria.drinking)) return false;
  if (!scheduleAccepts(myProfile.schedule, theirCriteria.schedule)) return false;
  if (!arrIntersects(parseJ(myProfile.hobbies), parseJ(theirCriteria.hobbies))) return false;
  if (!arrIntersects(parseJ(myProfile.personality), parseJ(theirCriteria.personality))) return false;
  return true;
}

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
      display_name: maskName(them.name),
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
