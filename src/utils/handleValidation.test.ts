import { describe, expect, it } from 'vitest';
import { validateHandle } from './handleValidation';

describe('validateHandle', () => {
  it('accepts valid handles', () => {
    expect(validateHandle('alice_42').ok).toBe(true);
  });

  it('rejects invalid chars', () => {
    expect(validateHandle('alice!').ok).toBe(false);
    expect(validateHandle('ab').ok).toBe(false);
  });

  it('blocks reserved exact handles', () => {
    expect(validateHandle('admin').ok).toBe(false);
  });
});
