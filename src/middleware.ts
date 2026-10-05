import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static files and internal Next.js assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Clone headers so we can inject auth headers downstream
  const requestHeaders = new Headers(req.headers);

  // Check for session cookie or bearer token
  const sessionToken = req.cookies.get('sp_session')?.value || 
                       req.headers.get('authorization')?.replace('Bearer ', '');

  if (sessionToken) {
    try {
      const [payloadBase64] = sessionToken.split('.');
      if (payloadBase64) {
        const payload = JSON.parse(
          Buffer.from(payloadBase64, 'base64url').toString('utf-8')
        );
        if (payload && payload.id && payload.tenantId) {
          requestHeaders.set('x-user-id', payload.id);
          requestHeaders.set('x-tenant-id', payload.tenantId);
          requestHeaders.set('x-user-role', payload.role || 'ANALYST');
          requestHeaders.set('x-user-email', payload.email || '');
          requestHeaders.set('x-user-name', payload.name || '');
          return NextResponse.next({ request: { headers: requestHeaders } });
        }
      }
    } catch {
      // Malformed token, fall through to dev defaults
    }
  }

  // Permissive Dev Fallback: Populate default tenant and admin user
  requestHeaders.set('x-user-id', 'cmutrx66a0001lv7nm7h456px');
  requestHeaders.set('x-tenant-id', 'tenant-default');
  requestHeaders.set('x-user-role', 'ADMIN');
  requestHeaders.set('x-user-email', 'manager@demo.in');
  requestHeaders.set('x-user-name', 'Demo Manager');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
