import { describe, expect, it } from 'vitest';
import { deriveFeatures, envSchema, env, features, isTestMode } from './env';

// Unit tests for the zod env layer. We exercise the schema and the feature
// derivation as pure functions (constructed inputs, never process.env) so they
// are deterministic regardless of the shell the suite runs in.

describe('envSchema', () => {
  it('parses an empty object by applying local-dev defaults', () => {
    const parsed = envSchema.parse({});
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.DATABASE_URL).toMatch(/^postgresql:\/\//u);
    expect(parsed.BETTER_AUTH_SECRET.length).toBeGreaterThan(0);
    expect(parsed.BETTER_AUTH_URL).toMatch(/^http/u);
    // Optional integrations are absent by default.
    expect(parsed.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(parsed.RESEND_API_KEY).toBeUndefined();
    expect(parsed.PUBLIC_UMAMI_WEBSITE_ID).toBeUndefined();
  });

  it('accepts the three supported NODE_ENV values', () => {
    for (const value of ['development', 'production', 'test'] as const) {
      expect(envSchema.parse({ NODE_ENV: value }).NODE_ENV).toBe(value);
    }
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(envSchema.safeParse({ NODE_ENV: 'staging' }).success).toBe(false);
  });

  it('rejects a malformed BETTER_AUTH_URL', () => {
    expect(envSchema.safeParse({ BETTER_AUTH_URL: 'not-a-url' }).success).toBe(false);
  });
});

describe('deriveFeatures', () => {
  const base = envSchema.parse({});

  it('reports every integration off when nothing is configured', () => {
    expect(deriveFeatures(base)).toEqual({ google: false, resend: false, umami: false });
  });

  it('requires BOTH Google vars before Google is considered configured', () => {
    expect(deriveFeatures({ ...base, GOOGLE_CLIENT_ID: 'id' }).google).toBe(false);
    expect(
      deriveFeatures({ ...base, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' }).google,
    ).toBe(true);
  });

  it('reflects Resend presence', () => {
    expect(deriveFeatures({ ...base, RESEND_API_KEY: 're_123' }).resend).toBe(true);
  });

  it('reflects Umami presence', () => {
    expect(deriveFeatures({ ...base, PUBLIC_UMAMI_WEBSITE_ID: 'abc' }).umami).toBe(true);
  });
});

describe('module exports', () => {
  it('validates process.env at import without throwing', () => {
    expect(env.NODE_ENV).toBeDefined();
    expect(features).toEqual({
      google: expect.any(Boolean),
      resend: expect.any(Boolean),
      umami: expect.any(Boolean),
    });
    expect(typeof isTestMode).toBe('boolean');
  });
});
