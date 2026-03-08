// Simple in-memory rate limiter for API routes
// No external deps needed

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function rateLimit(
  identifier: string, 
  maxRequests: number = 30, 
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const allowed = entry.count <= maxRequests;
  return { 
    allowed, 
    remaining: Math.max(0, maxRequests - entry.count), 
    resetAt: entry.resetAt 
  };
}

// Get IP from request headers (works behind nginx/cloudflare)
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

// Helper for API routes
export function checkRateLimit(
  request: Request, 
  maxRequests: number = 30, 
  windowMs: number = 60_000
): Response | null {
  const ip = getClientIP(request);
  const { allowed, remaining, resetAt } = rateLimit(ip, maxRequests, windowMs);
  
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { 
        status: 429, 
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        } 
      }
    );
  }
  
  return null; // Allowed
}
