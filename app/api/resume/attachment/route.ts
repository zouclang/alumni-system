import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }

    const originalName = file.name || 'resume.pdf';
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: '仅支持上传 PDF、Word（.doc、.docx）格式的文件' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过 15MB' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'resumes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Check existing attachment to remove old file on disk
    const existing = db.prepare('SELECT resume_file_url FROM resume_skills WHERE alumni_id = ?').get(userRow.alumni_id) as any;
    if (existing?.resume_file_url) {
      try {
        const oldFilename = path.basename(existing.resume_file_url);
        const oldPath = path.join(uploadDir, oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) {}
    }

    const savedFilename = `resume_${userRow.alumni_id}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, savedFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const resumeFileUrl = `/api/resume/attachment/file/${savedFilename}`;
    const uploadedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO resume_skills (alumni_id, resume_file_url, resume_file_name, resume_file_size, resume_file_uploaded_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(alumni_id) DO UPDATE SET
        resume_file_url = excluded.resume_file_url,
        resume_file_name = excluded.resume_file_name,
        resume_file_size = excluded.resume_file_size,
        resume_file_uploaded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).run(userRow.alumni_id, resumeFileUrl, originalName, file.size);

    return NextResponse.json({
      success: true,
      url: resumeFileUrl,
      fileName: originalName,
      fileSize: file.size,
      uploadedAt
    });
  } catch (error) {
    console.error('Error uploading resume attachment:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });

    const existing = db.prepare('SELECT resume_file_url FROM resume_skills WHERE alumni_id = ?').get(userRow.alumni_id) as any;
    if (existing?.resume_file_url) {
      try {
        const oldFilename = path.basename(existing.resume_file_url);
        const oldPath = path.join(process.cwd(), 'data', 'uploads', 'resumes', oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) {}
    }

    db.prepare(`
      UPDATE resume_skills 
      SET resume_file_url = NULL, resume_file_name = NULL, resume_file_size = 0, resume_file_uploaded_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE alumni_id = ?
    `).run(userRow.alumni_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting resume attachment:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
