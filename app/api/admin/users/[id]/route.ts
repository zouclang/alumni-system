import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: '未登录或无权操作' }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;
    const db = getDb();

    // Use a transaction to ensure atomic deletion of user and related records
    const transaction = db.transaction(() => {
      // 0. Check linked alumni record
      const targetUser = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(userId) as any;
      if (targetUser?.alumni_id) {
        const alumni = db.prepare('SELECT id, seq_no, status FROM alumni WHERE id = ?').get(targetUser.alumni_id) as any;
        if (alumni) {
          // Old alumnus (has seq_no): always keep record intact and status APPROVED
          if (alumni.seq_no !== null && alumni.seq_no !== undefined) {
            db.prepare("UPDATE alumni SET status = 'APPROVED' WHERE id = ?").run(targetUser.alumni_id);
          } else if (alumni.status !== 'APPROVED') {
            // Unapproved new registration: delete temporary alumni record and experiences
            db.prepare('DELETE FROM school_experiences WHERE alumni_id = ?').run(targetUser.alumni_id);
            db.prepare('DELETE FROM alumni WHERE id = ?').run(targetUser.alumni_id);
          }
        }
      }

      // 1. Delete requests where this user is the requester
      db.prepare('DELETE FROM contact_requests WHERE requester_id = ?').run(userId);
      db.prepare('DELETE FROM correction_requests WHERE requester_id = ?').run(userId);

      // 2. Delete the user record itself
      const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      return result.changes;
    });

    const changes = transaction();

    if (changes === 0) {
      return NextResponse.json({ error: '未找到该注册账号' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '注册账号已成功删除' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
