import { expect, test } from 'vitest';
import { z } from 'zod';

import { formError, parseForm } from './form';

test('parseForm normalizes missing and file fields and ignores unrelated input', async () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.email(),
    password: z.string().min(8),
  });
  const body = new FormData();
  body.set('name', new File(['New User'], 'name.txt'));
  body.set('email', 'user@example.test');
  body.set('unrelated', 'ignored');

  const request = new Request('https://example.test', { method: 'POST', body });
  const { values, parsed } = await parseForm(request, schema);

  expect(values).toStrictEqual({ name: '', email: 'user@example.test', password: '' });
  expect(parsed.success).toBe(false);
  expect(parsed.error && formError(parsed.error)).toBe('Name is required');
});

test('parseForm keeps the submitted text for redisplay and takes the first of repeated fields', async () => {
  const schema = z.object({ name: z.string().trim().min(1), email: z.email() });
  const body = new FormData();
  body.append('name', ' Ada ');
  body.append('name', 'Other');
  body.set('email', 'ada@example.test');

  const request = new Request('https://example.test', { method: 'POST', body });
  const { values, parsed } = await parseForm(request, schema);

  expect(values).toStrictEqual({ name: ' Ada ', email: 'ada@example.test' });
  expect(parsed).toStrictEqual({ success: true, data: { name: 'Ada', email: 'ada@example.test' } });
});
