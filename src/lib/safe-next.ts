/**
 * Open-redirect guard for post-login `?next=` redirects. Only same-origin, path
 * -relative destinations are allowed; anything else falls back. Never redirect a
 * user to a URL derived from untrusted input without passing it through this.
 */
export function safeNext(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith('/')) return fallback;
  if (next.startsWith('//')) return fallback;
  if (next.includes('\\')) return fallback;
  if (next.startsWith('/api/')) return fallback;
  return next;
}
