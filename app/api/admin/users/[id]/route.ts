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

    // Delete from users table by ID
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    if (result.changes === 0) {
      return NextResponse.json({ error: '未找到该注册账号' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '注册账号已成功删除' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
