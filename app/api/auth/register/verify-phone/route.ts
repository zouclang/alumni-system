import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const phone = searchParams.get('phone');

    if (!id || !phone) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const db = getDb();
    const alumni = db.prepare('SELECT phone FROM alumni WHERE id = ?').get(id) as any;

    if (!alumni) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Standardize phone for comparison (strip .0 if present)
    const storedPhone = alumni.phone ? alumni.phone.toString().replace(/\.0$/, '') : '';
    const inputPhone = phone.toString().replace(/\.0$/, '');

    if (storedPhone && storedPhone !== inputPhone) {
      return NextResponse.json({ 
        match: false, 
        message: '手机号与系统预留信息不符，请重新输入' 
      });
    }

    return NextResponse.json({ match: true });
  } catch (error) {
    console.error('Verify phone error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
