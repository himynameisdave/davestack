import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape';
import { buildEmailLayout } from './layout';
import { magicLinkTemplate } from './magic-link';
import { resetPasswordTemplate } from './reset-password';
import { verifyEmailTemplate } from './verify-email';

const YEAR = new Date().getFullYear();

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('escapes ampersands before other entities (no double-encoding)', () => {
    expect(escapeHtml('<a href="x&y">')).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;');
  });

  it('leaves safe text untouched', () => {
    expect(escapeHtml('https://example.com/verify')).toBe('https://example.com/verify');
  });
});

describe('buildEmailLayout', () => {
  it('wraps content in the neutral davestack shell', () => {
    const html = buildEmailLayout('<p data-marker>inner</p>');
    expect(html).toContain('<p data-marker>inner</p>');
    expect(html).toContain('davestack');
    expect(html).toContain(`&copy; ${YEAR} davestack`);
    // Rebranded: no smallreads theming leaked through.
    expect(html).not.toContain('smallreads');
  });
});

const templates = [
  { name: 'verifyEmailTemplate', build: verifyEmailTemplate },
  { name: 'magicLinkTemplate', build: magicLinkTemplate },
  { name: 'resetPasswordTemplate', build: resetPasswordTemplate },
] as const;

describe('action templates', () => {
  // A url with a query `&` so escaping is observable.
  const url = 'https://example.com/action?token=abc123&next=/home';

  for (const { name, build } of templates) {
    describe(name, () => {
      const message = build(url);

      it('returns a non-empty subject, html, and text', () => {
        expect(message.subject.length).toBeGreaterThan(0);
        expect(message.html.length).toBeGreaterThan(0);
        expect(message.text.length).toBeGreaterThan(0);
      });

      it('renders through the shared layout', () => {
        expect(message.html).toContain('davestack');
        expect(message.html).toContain(`&copy; ${YEAR} davestack`);
      });

      it('escapes the url in html but keeps it raw in text', () => {
        expect(message.html).toContain(`href="${escapeHtml(url)}"`);
        expect(message.html).toContain('token=abc123&amp;next=/home');
        expect(message.html).not.toContain('token=abc123&next'); // raw & must not survive
        expect(message.text).toContain(url);
      });
    });
  }
});
