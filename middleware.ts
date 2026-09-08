import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'bnp_driver_session';

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/driver') && pathname !== '/api/driver/login') {
    const ok = await hasValidSession(request);
    if (!ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (pathname.startsWith('/driver') && pathname !== '/driver/login') {
    const ok = await hasValidSession(request);
    if (!ok) {
      const loginUrl = new URL('/driver/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/driver/:path*', '/api/driver/:path*'],
};
