import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDb();
    const userPending = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'PENDING' AND role != 'ADMIN'").get() as { count: number };
    const contactPending = db.prepare("SELECT COUNT(*) as count FROM contact_requests WHERE status = 'PENDING'").get() as { count: number };
    const correctionPending = db.prepare("SELECT COUNT(*) as count FROM correction_requests WHERE status = 'PENDING'").get() as { count: number };

    const total = userPending.count + contactPending.count + correctionPending.count;

    if (_request.nextUrl.searchParams.get('detail') === '1') {
      return NextResponse.json({ 
        count: total,
        registration: userPending.count,
        contact: contactPending.count,
        correction: correctionPending.count
      });
    }

    return NextResponse.json({ count: total });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
