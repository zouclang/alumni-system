import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let hasIncompleteProfile = false;
    if (session.alumniId) {
      const db = getDb();
      const exps = db.prepare('SELECT is_public FROM school_experiences WHERE alumni_id = ?').all(session.alumniId) as { is_public: number | null }[];
      if (exps.length === 0 || exps.some(e => e.is_public === null || e.is_public === undefined)) {
        hasIncompleteProfile = true;
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        ...session,
        hasIncompleteProfile,
      }
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
