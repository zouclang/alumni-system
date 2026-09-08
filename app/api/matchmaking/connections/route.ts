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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (!session.alumniId) return NextResponse.json({ error: '未绑定校友信息' }, { status: 400 });

  const db = getDb();
  const myApp = db.prepare(`SELECT status FROM matchmaking_applications WHERE alumni_id = ?`).get(session.alumniId) as any;
  if (!myApp || myApp.status !== 'APPROVED') return NextResponse.json({ error: '未加入喜结连理' }, { status: 403 });

  const body = await req.json();
  const { action, target_alumni_id, reject_reason } = body;

  if (!target_alumni_id) return NextResponse.json({ error: '缺少目标用户' }, { status: 400 });

  if (action === 'apply') {
    // Check if previously rejected (I was applicant, they rejected)
    const rejected = db.prepare(`SELECT id FROM matchmaking_connections WHERE applicant_alumni_id=? AND target_alumni_id=? AND status='REJECTED'`).get(session.alumniId, target_alumni_id);
    if (rejected) return NextResponse.json({ error: '对方已拒绝，无法再次申请' }, { status: 400 });

    const existing = db.prepare(`SELECT * FROM matchmaking_connections WHERE applicant_alumni_id=? AND target_alumni_id=?`).get(session.alumniId, target_alumni_id) as any;
    if (existing) {
      if (existing.status === 'PENDING') return NextResponse.json({ error: '已有待处理的申请' }, { status: 400 });
      if (existing.status === 'APPROVED') return NextResponse.json({ error: '已建立对接关系' }, { status: 400 });
      db.prepare(`UPDATE matchmaking_connections SET status='PENDING', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(existing.id);
    } else {
      db.prepare(`INSERT INTO matchmaking_connections (applicant_alumni_id, target_alumni_id, status) VALUES (?,?,'PENDING')`).run(session.alumniId, target_alumni_id);
    }
    sendNotification(db, target_alumni_id, '您在喜结连理中收到了一条新的对接申请，请前往查看');
    return NextResponse.json({ success: true });
  }

  if (action === 'withdraw') {
    const existing = db.prepare(`SELECT * FROM matchmaking_connections WHERE applicant_alumni_id=? AND target_alumni_id=? AND status='PENDING'`).get(session.alumniId, target_alumni_id);
    if (!existing) return NextResponse.json({ error: '没有可撤回的申请' }, { status: 400 });
    db.prepare(`UPDATE matchmaking_connections SET status='WITHDRAWN', updated_at=CURRENT_TIMESTAMP WHERE applicant_alumni_id=? AND target_alumni_id=?`).run(session.alumniId, target_alumni_id);
    return NextResponse.json({ success: true });
  }

  if (action === 'approve') {
    // Their request: applicant=target, target=me
    const theirReq = db.prepare(`SELECT * FROM matchmaking_connections WHERE applicant_alumni_id=? AND target_alumni_id=? AND status='PENDING'`).get(target_alumni_id, session.alumniId) as any;
    if (!theirReq) return NextResponse.json({ error: '没有待审核的申请' }, { status: 400 });
    db.prepare(`UPDATE matchmaking_connections SET status='APPROVED', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(theirReq.id);
    // Also approve reverse if exists
    db.prepare(`UPDATE matchmaking_connections SET status='APPROVED', updated_at=CURRENT_TIMESTAMP WHERE applicant_alumni_id=? AND target_alumni_id=?`).run(session.alumniId, target_alumni_id);
    sendNotification(db, target_alumni_id, '您的对接申请已被对方通过，现在可以查看对方详细信息了 🎉');
    return NextResponse.json({ success: true });
  }

  if (action === 'reject') {
    const theirReq = db.prepare(`SELECT * FROM matchmaking_connections WHERE applicant_alumni_id=? AND target_alumni_id=? AND status='PENDING'`).get(target_alumni_id, session.alumniId) as any;
    if (!theirReq) return NextResponse.json({ error: '没有待审核的申请' }, { status: 400 });
    db.prepare(`UPDATE matchmaking_connections SET status='REJECTED', reject_reason=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(reject_reason || null, theirReq.id);
    sendNotification(db, target_alumni_id, '您的对接申请对方暂时不考虑，继续加油！');
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 });
}
