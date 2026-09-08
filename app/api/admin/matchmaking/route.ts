import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function sendNotification(db: any, alumniId: number, message: string) {
  try {
    const user = db.prepare('SELECT id FROM users WHERE alumni_id = ?').get(alumniId) as any;
    if (user) db.prepare(`INSERT INTO notifications (user_id, type, message) VALUES (?, 'matchmaking', ?)`).run(user.id, message);
  } catch(e) {}
}

// GET?tab=pending|approved|dashboard
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: '无权限' }, { status: 403 });

  const db = getDb();

  // If specific alumni_id is requested, return full matchmaking profile + criteria + alumni info
  const alumniIdParam = req.nextUrl.searchParams.get('alumni_id');
  if (alumniIdParam) {
    const aid = Number(alumniIdParam);
    const alumni = db.prepare(`
      SELECT a.*, u.id as user_id, u.username, u.status as user_status 
      FROM alumni a 
      LEFT JOIN users u ON u.alumni_id = a.id 
      WHERE a.id = ?
    `).get(aid);
    if (!alumni) return NextResponse.json({ error: '未找到校友' }, { status: 404 });
    const profile = db.prepare('SELECT * FROM matchmaking_profiles WHERE alumni_id = ?').get(aid) || null;
    const criteria = db.prepare('SELECT * FROM matchmaking_criteria WHERE alumni_id = ?').get(aid) || null;
    const application = db.prepare('SELECT * FROM matchmaking_applications WHERE alumni_id = ?').get(aid) || null;
    return NextResponse.json({ alumni, profile, criteria, application });
  }

  const tab = req.nextUrl.searchParams.get('tab') || 'pending';

  if (tab === 'pending') {
    const rows = db.prepare(`
      SELECT 
        ma.id as application_id, ma.id, ma.alumni_id, ma.status as app_status, ma.status, ma.created_at,
        u.id as user_id, u.username, u.status as user_status, u.role,
        a.*
      FROM matchmaking_applications ma
      JOIN alumni a ON a.id = ma.alumni_id
      LEFT JOIN users u ON u.alumni_id = a.id
      WHERE ma.status = 'PENDING'
      ORDER BY ma.created_at ASC
    `).all();
    return NextResponse.json({ applications: rows });
  }

  if (tab === 'approved') {
    const rows = db.prepare(`
      SELECT 
        ma.id as application_id, ma.id, ma.alumni_id, ma.status as app_status, ma.status, ma.updated_at as approved_at,
        u.id as user_id, u.username, u.status as user_status, u.role,
        COALESCE(mp.profile_completed, 0) as profile_completed,
        a.*
      FROM matchmaking_applications ma
      JOIN alumni a ON a.id = ma.alumni_id
      LEFT JOIN users u ON u.alumni_id = a.id
      LEFT JOIN matchmaking_profiles mp ON mp.alumni_id = ma.alumni_id
      WHERE ma.status = 'APPROVED'
      ORDER BY ma.updated_at DESC
    `).all();
    return NextResponse.json({ members: rows });
  }

  if (tab === 'dashboard') {
    const totalApps = (db.prepare("SELECT COUNT(*) as count FROM matchmaking_applications").get() as any)?.count || 0;
    const pendingApps = (db.prepare("SELECT COUNT(*) as count FROM matchmaking_applications WHERE status = 'PENDING'").get() as any)?.count || 0;
    const approvedMembers = (db.prepare("SELECT COUNT(*) as count FROM matchmaking_applications WHERE status = 'APPROVED'").get() as any)?.count || 0;
    
    const maleMembers = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM matchmaking_applications ma 
      JOIN alumni a ON a.id = ma.alumni_id 
      WHERE ma.status = 'APPROVED' AND (a.gender = 'M' OR a.gender = '男')
    `).get() as any)?.count || 0;

    const femaleMembers = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM matchmaking_applications ma 
      JOIN alumni a ON a.id = ma.alumni_id 
      WHERE ma.status = 'APPROVED' AND (a.gender = 'F' OR a.gender = '女')
    `).get() as any)?.count || 0;

    const completedProfiles = (db.prepare(`
      SELECT COUNT(*) as count FROM matchmaking_profiles WHERE profile_completed = 1 AND is_active = 1
    `).get() as any)?.count || 0;

    const totalConnections = (db.prepare("SELECT COUNT(*) as count FROM matchmaking_connections").get() as any)?.count || 0;
    const approvedConnections = (db.prepare("SELECT COUNT(*) as count FROM matchmaking_connections WHERE status = 'APPROVED'").get() as any)?.count || 0;
    const pendingConnections = (db.prepare("SELECT COUNT(*) as count FROM matchmaking_connections WHERE status = 'PENDING'").get() as any)?.count || 0;
    const rejectedConnections = (db.prepare("SELECT COUNT(*) as count FROM matchmaking_connections WHERE status = 'REJECTED'").get() as any)?.count || 0;

    // 申请频次监控榜单 (High-frequency applicants)
    const applicantStats = db.prepare(`
      SELECT 
        mc.applicant_alumni_id,
        a.name as applicant_name,
        a.gender as applicant_gender,
        a.phone as applicant_phone,
        a.wechat_id as applicant_wechat,
        a.college as applicant_college,
        a.enrollment_year as applicant_year,
        COUNT(*) as total_applied,
        SUM(CASE WHEN mc.status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN mc.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN mc.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
        MAX(mc.created_at) as latest_applied_at
      FROM matchmaking_connections mc
      JOIN alumni a ON a.id = mc.applicant_alumni_id
      GROUP BY mc.applicant_alumni_id
      ORDER BY total_applied DESC, latest_applied_at DESC
      LIMIT 100
    `).all();

    // 最近对接记录流水
    const recentConnections = db.prepare(`
      SELECT 
        mc.id,
        mc.applicant_alumni_id,
        app.name as applicant_name,
        app.gender as applicant_gender,
        app.wechat_id as applicant_wechat,
        app.phone as applicant_phone,
        mc.target_alumni_id,
        tgt.name as target_name,
        tgt.gender as target_gender,
        tgt.wechat_id as target_wechat,
        tgt.phone as target_phone,
        mc.status,
        mc.reject_reason,
        mc.created_at,
        mc.updated_at
      FROM matchmaking_connections mc
      JOIN alumni app ON app.id = mc.applicant_alumni_id
      JOIN alumni tgt ON tgt.id = mc.target_alumni_id
      ORDER BY mc.created_at DESC
      LIMIT 100
    `).all();

    // 已入驻单身校友列表（含已发起的申请数量、收到的申请数量）
    const approvedMemberList = db.prepare(`
      SELECT 
        ma.id as application_id,
        ma.alumni_id,
        ma.updated_at as approved_at,
        u.id as user_id,
        u.username,
        a.*,
        mp.age,
        mp.height,
        mp.marital_status,
        mp.job_type,
        mp.annual_income,
        COALESCE(mp.profile_completed, 0) as profile_completed,
        (SELECT COUNT(*) FROM matchmaking_connections WHERE applicant_alumni_id = ma.alumni_id) as applied_count,
        (SELECT COUNT(*) FROM matchmaking_connections WHERE target_alumni_id = ma.alumni_id) as received_count,
        (SELECT COUNT(*) FROM matchmaking_connections WHERE (applicant_alumni_id = ma.alumni_id OR target_alumni_id = ma.alumni_id) AND status = 'APPROVED') as mutual_count
      FROM matchmaking_applications ma
      JOIN alumni a ON a.id = ma.alumni_id
      LEFT JOIN users u ON u.alumni_id = a.id
      LEFT JOIN matchmaking_profiles mp ON mp.alumni_id = ma.alumni_id
      WHERE ma.status = 'APPROVED'
      ORDER BY ma.updated_at DESC
    `).all();

    return NextResponse.json({
      overview: {
        totalApps,
        pendingApps,
        approvedMembers,
        maleMembers,
        femaleMembers,
        completedProfiles,
        totalConnections,
        approvedConnections,
        pendingConnections,
        rejectedConnections,
      },
      approvedMemberList,
      applicantStats,
      recentConnections,
    });
  }

  return NextResponse.json({ error: '未知 tab' }, { status: 400 });
}

// POST: approve or reject application
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: '无权限' }, { status: 403 });

  const db = getDb();
  const { action, alumni_id, reject_reason } = await req.json();

  if (!alumni_id) return NextResponse.json({ error: '缺少 alumni_id' }, { status: 400 });

  if (action === 'approve') {
    db.prepare(`UPDATE matchmaking_applications SET status='APPROVED', updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`).run(alumni_id);
    // Reactivate matchmaking profile if previously created
    db.prepare(`UPDATE matchmaking_profiles SET is_active=1, updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`).run(alumni_id);
    sendNotification(db, alumni_id, '您的喜结连理入驻申请已通过审核，快去完善信息开始匹配吧 🌸');
    return NextResponse.json({ success: true });
  }

  if (action === 'reject') {
    db.prepare(`UPDATE matchmaking_applications SET status='REJECTED', reject_reason=?, updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`).run(reject_reason || null, alumni_id);
    sendNotification(db, alumni_id, '您的喜结连理入驻申请未通过审核，如有疑问请联系管理员');
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 });
}

// DELETE: remove approved member (silent)
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: '无权限' }, { status: 403 });

  const db = getDb();
  const { alumni_id } = await req.json();
  if (!alumni_id) return NextResponse.json({ error: '缺少 alumni_id' }, { status: 400 });

  // Delete application record so they can re-apply fresh
  db.prepare(`DELETE FROM matchmaking_applications WHERE alumni_id=?`).run(alumni_id);
  // Soft-delete profile (keep data but mark inactive)
  db.prepare(`UPDATE matchmaking_profiles SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE alumni_id=?`).run(alumni_id);
  // matchmaking_connections intentionally preserved

  return NextResponse.json({ success: true });
}
