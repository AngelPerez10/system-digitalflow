import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (class merge utility)', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('filters out falsy values', () => {
    const result = cn('foo', false, undefined, null, 'bar');
    expect(result).toBe('foo bar');
  });

  it('returns empty string for no args', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
