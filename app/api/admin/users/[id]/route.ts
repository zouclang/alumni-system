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
