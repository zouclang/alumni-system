import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

// Paths that are accessible without authentication
const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Get session from cookies
  const session = request.cookies.get('session')?.value;

  if (isPublicPath) {
    // If accessing public path while authenticated, redirect to home
    if (session) {
      try {
        await decrypt(session);
        return NextResponse.redirect(new URL('/', request.url));
      } catch (e) {
        // Token invalid, allow access to public path
      }
    }
    return NextResponse.next();
  }

  // If accessing protected path without session, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decoded = await decrypt(session);
    
    // Check for expiration
    const expires = new Date(decoded.expires);
    if (expires < new Date()) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based protection example:
    // Only ADMIN can access /admin paths
    if (pathname.startsWith('/admin') && decoded.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Session invalid or decryption failed
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes, unless explicitly protected)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.png, etc. (static public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.png|.*\\.svg).*)',
  ],
};
