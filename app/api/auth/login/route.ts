import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { username, realName, password } = await request.json();
    const db = getDb();

    let user: any = null;

    if (username) {
      // Admin login by username
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    } else if (realName) {
      // Alumni login by real name
      // This requires joining with alumni table or having the real name in users
      // For now, let's assume we search by alumni name linked to user
      user = db.prepare(`
        SELECT u.*, a.name as real_name 
        FROM users u 
        JOIN alumni a ON u.alumni_id = a.id 
        WHERE a.name = ?
      `).get(realName);
    }

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    if (user.status !== 'APPROVED') {
      return NextResponse.json({ error: '账号待审核或已停用' }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // Fetch association_role if this is an alumni user
    let associationRole = null;
    if (user.alumni_id) {
      const alumni = db.prepare('SELECT association_role FROM alumni WHERE id = ?').get(user.alumni_id) as any;
      associationRole = alumni?.association_role;
    }

    // Create session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const sessionToken = await encrypt({
      userId: user.id,
      username: user.username,
      realName: user.real_name,
      alumniId: user.alumni_id,
      role: user.role,
      association_role: associationRole,
      expires,
    });

    // Save session in cookie
    (await cookies()).set('session', sessionToken, {
      expires,
      httpOnly: true,
      secure: false, // Set to false to allow login on HTTP (localhost) without HTTPS
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        alumniId: user.alumni_id
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
