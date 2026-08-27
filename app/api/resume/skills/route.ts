import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const row = db.prepare('SELECT * FROM resume_skills WHERE alumni_id = ?').get(userRow.alumni_id) as any;
    if (!row) return NextResponse.json({ skill_tags: '[]', languages: '[]', bio: '' });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = getDb();
    const userRow = db.prepare('SELECT alumni_id FROM users WHERE id = ?').get(session.userId) as { alumni_id: number } | null;
    if (!userRow?.alumni_id) return NextResponse.json({ error: 'No alumni profile' }, { status: 400 });
    const body = await req.json();
    const { skill_tags, languages, bio } = body;
    const skillTagsStr = JSON.stringify(Array.isArray(skill_tags) ? skill_tags : []);
    const languagesStr = JSON.stringify(Array.isArray(languages) ? languages : []);
    const bioStr = (bio || '').slice(0, 500);
    db.prepare(`
      INSERT INTO resume_skills (alumni_id, skill_tags, languages, bio, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(alumni_id) DO UPDATE SET skill_tags=excluded.skill_tags, languages=excluded.languages, bio=excluded.bio, updated_at=CURRENT_TIMESTAMP
    `).run(userRow.alumni_id, skillTagsStr, languagesStr, bioStr);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
