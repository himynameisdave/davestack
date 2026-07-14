import { describe, it, expect } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  const fallback = '/home';

  it('returns fallback for null', () => {
    expect(safeNext(null, fallback)).toBe(fallback);
  });

  it('returns fallback for empty string', () => {
    expect(safeNext('', fallback)).toBe(fallback);
  });

  it('returns fallback for paths without leading slash', () => {
    expect(safeNext('home', fallback)).toBe(fallback);
    expect(safeNext('http://evil.com', fallback)).toBe(fallback);
  });

  it('returns fallback for protocol-relative URLs', () => {
    expect(safeNext('//evil.com', fallback)).toBe(fallback);
    expect(safeNext('//evil.com/home', fallback)).toBe(fallback);
  });

  it('returns fallback for paths with backslashes', () => {
    expect(safeNext('/\\evil.com', fallback)).toBe(fallback);
    expect(safeNext('/foo\\bar', fallback)).toBe(fallback);
  });

  it('returns fallback for /api/ paths', () => {
    expect(safeNext('/api/auth/session', fallback)).toBe(fallback);
    expect(safeNext('/api/anything', fallback)).toBe(fallback);
  });

  it('allows valid relative paths', () => {
    expect(safeNext('/home', fallback)).toBe('/home');
    expect(safeNext('/account', fallback)).toBe('/account');
    expect(safeNext('/account?tab=passkeys', fallback)).toBe('/account?tab=passkeys');
  });

  it('uses the provided fallback', () => {
    expect(safeNext(null, '/account')).toBe('/account');
    expect(safeNext('//evil.com', '/account')).toBe('/account');
  });
});
