import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://gembots.space',
  'https://www.gembots.space',
  'https://gembots.ainmid.com',
];

function getCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return null;
}

export function middleware(request: NextRequest) {
  // Block invalid Server Action requests (bot scanners sending Next-Action: "x")
  const nextAction = request.headers.get('next-action');
  if (nextAction && !/^[a-f0-9]{40}$/.test(nextAction)) {
    return new NextResponse(null, { status: 403 });
  }

  const corsOrigin = getCorsOrigin(request);

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    };
    if (corsOrigin) {
      headers['Access-Control-Allow-Origin'] = corsOrigin;
    }
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');

  // CORS
  if (corsOrigin) {
    response.headers.set('Access-Control-Allow-Origin', corsOrigin);
  }

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
