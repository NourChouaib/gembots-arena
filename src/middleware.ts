import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Block invalid Server Action requests (bot scanners sending Next-Action: "x")
  const nextAction = request.headers.get('next-action');
  if (nextAction && !/^[a-f0-9]{40}$/.test(nextAction)) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
