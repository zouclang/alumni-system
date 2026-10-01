import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { filename } = await params;

    // Security: sanitize filename against path traversal
    if (!filename || !/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', 'uploads', 'resumes', filename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    const currentAlumniId = userRow?.alumni_id;

    // Access authorization check
    const match = filename.match(/^resume_(\d+)_/);
    if (match) {
      const ownerAlumniId = parseInt(match[1]);
      const isOwner = currentAlumniId === ownerAlumniId;
      const isAdmin = session.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        // Check if applicant applied to a job published by current user
        let hasPermission = false;
        if (currentAlumniId) {
          const appRecord = db.prepare(`
            SELECT 1 FROM job_applications ja
            JOIN job_postings jp ON ja.job_id = jp.id
            WHERE ja.applicant_alumni_id = ? AND jp.publisher_alumni_id = ?
            LIMIT 1
          `).get(ownerAlumniId, currentAlumniId);
          if (appRecord) hasPermission = true;
        }

        if (!hasPermission) {
          return new NextResponse('Forbidden', { status: 403 });
        }
      }
    }

    // Lookup original filename for clean download name
    const skillRow = db.prepare('SELECT resume_file_name FROM resume_skills WHERE resume_file_url LIKE ?').get(`%${filename}%`) as any;
    const originalName = skillRow?.resume_file_name || filename;

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.doc') contentType = 'application/msword';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get('download') === '1' || ext !== '.pdf';
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const encodedName = encodeURIComponent(originalName);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${dispositionType}; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving resume attachment:', error);
    return new NextResponse('Error serving file', { status: 500 });
  }
}
