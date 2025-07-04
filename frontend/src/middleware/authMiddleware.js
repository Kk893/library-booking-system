import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('auth_token');
  const userRole = request.cookies.get('user_role');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // If trying to access admin routes without proper authentication
  if (isAdminRoute && (!token || !userRole || (userRole.value !== 'admin' && userRole.value !== 'superadmin'))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*'
  ]
};