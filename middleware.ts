import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session from cookies
  const session = request.cookies.get('session')?.value;

  if (pathname === '/login' || pathname === '/register') {
    // If accessing alumni login/register while authenticated, redirect to home
    if (session) {
      try {
        await decrypt(session);
        return NextResponse.redirect(new URL('/', request.url));
      } catch (e) {
        // Token invalid, allow access
      }
    }
    return NextResponse.next();
  }

  if (pathname === '/admin') {
    // If accessing admin login page /admin while authenticated as ADMIN, redirect to permissions dashboard
    if (session) {
      try {
        const decoded = await decrypt(session);
        if (decoded.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin/permissions', request.url));
        }
      } catch (e) {}
    }
    return NextResponse.next();
  }

  // API auth endpoints are public
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    return NextResponse.next();
  }

  // If accessing protected path without session
  if (!session) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decoded = await decrypt(session);
    
    // Check for expiration
    const expires = new Date(decoded.expires);
    if (expires < new Date()) {
      if (pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based protection: Only ADMIN can access /admin/* paths
    if (pathname.startsWith('/admin/') && decoded.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.png|.*\\.svg).*)',
  ],
};
