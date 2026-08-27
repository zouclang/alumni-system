import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user: session });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
