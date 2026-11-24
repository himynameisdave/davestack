export function safeNext(next: string | null, fallback: string): string {
  if (!next) {
    return fallback;
  }
  if (!next.startsWith('/')) {
    return fallback;
  }
  if (next.startsWith('//')) {
    return fallback;
  }
  if (next.includes('\\')) {
    return fallback;
  }
  if (next.startsWith('/api/')) {
    return fallback;
  }
  return next;
}
