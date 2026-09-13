import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (!session.alumniId) return NextResponse.json({ error: '未绑定校友信息' }, { status: 400 });

    const db = getDb();
    const app = db.prepare('SELECT status FROM matchmaking_applications WHERE alumni_id = ?').get(session.alumniId) as any;
    if (!app || app.status !== 'APPROVED') {
      return NextResponse.json({ error: '未加入喜结连理' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未选择照片' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '请上传有效的图片文件' }, { status: 400 });
    }

    // Safety ceiling: 2MB max (client compresses to 300~500KB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: '照片大小不能超过2MB，请先压缩' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'matchmaking');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = file.type === 'image/png' ? '.png' : '.jpg';
    const filename = `photo_${session.alumniId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const photoUrl = `/api/matchmaking/photo/${filename}`;

    // Update in matchmaking_profiles
    const existing = db.prepare('SELECT id FROM matchmaking_profiles WHERE alumni_id = ?').get(session.alumniId);
    if (existing) {
      db.prepare('UPDATE matchmaking_profiles SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE alumni_id = ?')
        .run(photoUrl, session.alumniId);
    } else {
      db.prepare('INSERT INTO matchmaking_profiles (alumni_id, photo_url) VALUES (?, ?)')
        .run(session.alumniId, photoUrl);
    }

    return NextResponse.json({ success: true, photo_url: photoUrl });
  } catch (error) {
    console.error('Upload photo error:', error);
    return NextResponse.json({ error: '上传照片失败，请重试' }, { status: 500 });
  }
}
