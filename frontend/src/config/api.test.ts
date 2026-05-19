import { describe, it, expect } from 'vitest';
import { apiUrl } from './api';

describe('apiUrl', () => {
  it('prepends / if path doesn\'t start with /', () => {
    const result = apiUrl('api/me');
    expect(result).toMatch(/\/api\/me$/);
  });

  it('keeps / prefix if already present', () => {
    const result = apiUrl('/api/me');
    expect(result).toMatch(/\/api\/me$/);
  });

  it('returns absolute URL when not in Vite dev mode', () => {
    const result = apiUrl('/api/test');
    expect(result).toMatch(/^https?:\/\//);
  });
});
