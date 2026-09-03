import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

import Input from './input.svelte';

// ponytail: no `type="file"` case here — happy-dom's HTMLInputElement `.value` getter
// crashes on mount for file inputs (reads an internal FileList before it's initialized),
// and this component always sets up `bind:value` regardless of `type`, so any render of
// `<Input type="file" />` throws under happy-dom today, independent of assertions. Filed
// upstream: https://github.com/capricorn86/happy-dom/issues/2356 — retest once fixed, or
// give the `client` project a per-file jsdom override (vitest `environmentMatchGlobs`) if
// file-input coverage is needed sooner.
describe(Input, () => {
  it('renders a text input by default', () => {
    const { container } = render(Input);
    const input = container.querySelector('input');

    expect(input?.type).toBe('text');
  });

  it('reflects the value prop into the DOM', () => {
    const { container } = render(Input, { props: { value: 'hello' } });
    const input = container.querySelector('input');

    expect(input).toHaveValue('hello');
  });

  it('passes through arbitrary attributes to the underlying element', () => {
    const { container } = render(Input, {
      props: { disabled: true, placeholder: 'Email' },
    });
    const input = container.querySelector('input');

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('placeholder', 'Email');
  });
});
