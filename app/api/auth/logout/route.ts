import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    (await cookies()).set('session', '', { expires: new Date(0), path: '/' });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
