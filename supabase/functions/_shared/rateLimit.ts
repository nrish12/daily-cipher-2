const rateLimitStore = new Map<string, number[]>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  userId: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];

  // Remove old requests outside window
  const recentRequests = userRequests.filter(time => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return false; // Rate limited
  }

  recentRequests.push(now);
  rateLimitStore.set(userId, recentRequests);
  return true;
}

export function getRateLimitInfo(userId: string, windowMs: number = 60000): {
  requestCount: number;
  oldestRequest: number | null;
  remainingMs: number;
} {
  const now = Date.now();
  const userRequests = rateLimitStore.get(userId) || [];
  const recentRequests = userRequests.filter(time => now - time < windowMs);

  return {
    requestCount: recentRequests.length,
    oldestRequest: recentRequests[0] || null,
    remainingMs: recentRequests[0] ? windowMs - (now - recentRequests[0]) : 0
  };
}

export function createRateLimitResponse(retryAfterMs: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(retryAfterMs / 1000) // seconds
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(retryAfterMs / 1000).toString(),
        'X-RateLimit-Remaining': '0'
      }
    }
  );
}
