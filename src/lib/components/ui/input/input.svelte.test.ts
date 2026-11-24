import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

import Input from './input.svelte';

// File inputs fail during value binding in happy-dom: https://github.com/capricorn86/happy-dom/issues/2356
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
