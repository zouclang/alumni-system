import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: '姓名不能为空' }, { status: 400 });
    }

    const db = getDb();
    
    // Search for existing alumni by name
    const matches = db.prepare(`
      SELECT id, name, college, enrollment_year, graduation_year, phone
      FROM alumni 
      WHERE name = ?
    `).all(name) as any[];

    // For each match, check if it's already linked to a user
    const processed = matches.map(m => {
      const isLinked = !!db.prepare('SELECT id FROM users WHERE alumni_id = ?').get(m.id);
      return {
        id: m.id,
        name: m.name,
        college: m.college,
        enrollment_year: m.enrollment_year,
        graduation_year: m.graduation_year,
        hasPhone: !!m.phone,
        isLinked
      };
    });

    return NextResponse.json({ matches: processed });
  } catch (error) {
    console.error('Check name error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
