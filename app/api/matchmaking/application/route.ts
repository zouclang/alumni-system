import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ application: null });

  const db = getDb();
  const app = db.prepare(`
    SELECT ma.*, COALESCE(mp.profile_completed, 0) as profile_completed
    FROM matchmaking_applications ma
    LEFT JOIN matchmaking_profiles mp ON mp.alumni_id = ma.alumni_id
    WHERE ma.alumni_id = ?
  `).get(session.alumniId);
  return NextResponse.json({ application: app || null });
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ error: '未绑定校友信息' }, { status: 400 });

  const db = getDb();

  // 方案 A：校验校友基本信息中的【性别】、【手机号】与【微信号】
  const alumni = db.prepare('SELECT id, gender, wechat_id, phone FROM alumni WHERE id = ?').get(session.alumniId) as any;
  if (!alumni) return NextResponse.json({ error: '未找到校友档案' }, { status: 404 });

  const rawGender = (alumni.gender || '').trim();
  const validGenders = ['M', 'F', '男', '女'];
  if (!rawGender || !validGenders.includes(rawGender)) {
    return NextResponse.json({
      error: '申请加入喜结连理必须明确性别，请先前往「个人中心」完善性别信息后再申请。',
      missing: 'gender',
      needProfile: true,
    }, { status: 400 });
  }

  const rawPhone = (alumni.phone || '').trim();
  if (!rawPhone) {
    return NextResponse.json({
      error: '申请加入喜结连理必须填写手机号码（便于管理员核实），请先前往「个人中心」完善手机号码后再申请。',
      missing: 'phone',
      needProfile: true,
    }, { status: 400 });
  }

  const rawWechat = (alumni.wechat_id || '').trim();
  if (!rawWechat) {
    return NextResponse.json({
      error: '申请加入喜结连理必须填写微信号（用于管理员核实及匹配成功后对接），请先前往「个人中心」完善微信号后再申请。',
      missing: 'wechat_id',
      needProfile: true,
    }, { status: 400 });
  }

  const existing = db.prepare('SELECT * FROM matchmaking_applications WHERE alumni_id = ?').get(session.alumniId) as any;

  if (existing) {
    if (existing.status === 'PENDING') return NextResponse.json({ error: '已有待审核的申请' }, { status: 400 });
    if (existing.status === 'APPROVED') return NextResponse.json({ error: '您已是喜结连理成员' }, { status: 400 });
    db.prepare(`UPDATE matchmaking_applications SET status='PENDING', reject_reason=NULL, updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`).run(session.alumniId);
  } else {
    db.prepare(`INSERT INTO matchmaking_applications (alumni_id, status) VALUES (?, 'PENDING')`).run(session.alumniId);
  }

  // 同步初始化/更新 matchmaking_profiles 的 gender 字段（M/F）
  const normalizedGender = (rawGender === '男' || rawGender === 'M') ? 'M' : 'F';
  try {
    db.prepare(`
      INSERT INTO matchmaking_profiles (alumni_id, gender, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(alumni_id) DO UPDATE SET gender=excluded.gender, updated_at=CURRENT_TIMESTAMP
    `).run(session.alumniId, normalizedGender);
  } catch (e) {}

  return NextResponse.json({ success: true });
}

// PUT: exit matchmaking (user self-exit)
export async function PUT() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ error: '未绑定校友信息' }, { status: 400 });

  const db = getDb();
  db.prepare(`UPDATE matchmaking_applications SET status='WITHDRAWN', updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`).run(session.alumniId);
  db.prepare(`UPDATE matchmaking_profiles SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`).run(session.alumniId);
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ error: '未绑定校友信息' }, { status: 400 });

  const db = getDb();
  const existing = db.prepare(`SELECT * FROM matchmaking_applications WHERE alumni_id = ? AND status = 'PENDING'`).get(session.alumniId);
  if (!existing) return NextResponse.json({ error: '没有待撤回的申请' }, { status: 400 });
  db.prepare(`UPDATE matchmaking_applications SET status='WITHDRAWN', updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`).run(session.alumniId);
  return NextResponse.json({ success: true });
}
