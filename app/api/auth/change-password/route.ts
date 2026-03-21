import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();
    const db = getDb();

    // Get current user's password hash
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(session.userId) as any;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: '原密码错误' }, { status: 401 });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update database
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newHash, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
