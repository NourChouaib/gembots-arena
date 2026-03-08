import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 🛡️ Global Rate Limiting Middleware
 * - 100 req/min per IP for all API routes
 * - 30 req/min for mutation endpoints (POST/PUT/DELETE)
 * - CORS restrictions on mutation endpoints
 */

// In-memory rate limit stores (reset on restart — acceptable for edge middleware)
const globalStore = new Map<string, { count: number; resetAt: number }>();
const mutationStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup every 5 min
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of globalStore) {
    if (now > entry.resetAt) globalStore.delete(key);
  }
  for (const [key, entry] of mutationStore) {
    if (now > entry.resetAt) mutationStore.delete(key);
  }
}

function checkLimit(store: Map<string, { count: number; resetAt: number }>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

const ALLOWED_ORIGINS = [
  'https://gembots.space',
  'http://gembots.space',
  'http://localhost:3000',
  'http://localhost:3005',
  'http://151.243.169.169:3005',
];

export function proxy(request: NextRequest) {
  cleanup();
  
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
  const path = request.nextUrl.pathname;
  const method = request.method;
  
  // Skip non-API routes
  if (!path.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Global rate limit: 100 req/min per IP
  if (!checkLimit(globalStore, ip, 100, 60_000)) {
    console.warn(`[middleware] Global rate limit hit: ${ip} on ${path}`);
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  
  // Mutation rate limit: 30 req/min per IP for POST/PUT/DELETE
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    if (!checkLimit(mutationStore, ip, 30, 60_000)) {
      console.warn(`[middleware] Mutation rate limit hit: ${ip} ${method} ${path}`);
      return NextResponse.json(
        { error: 'Too many write requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    
    // CORS check for mutation endpoints
    const origin = request.headers.get('origin');
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      // Allow requests without origin (server-to-server, curl, etc.)
      // But block cross-origin browser requests from unknown domains
      console.warn(`[middleware] CORS blocked: ${origin} → ${method} ${path}`);
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403 }
      );
    }
  }
  
  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
