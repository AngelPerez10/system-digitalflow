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

  it('uses relative paths under Vite dev (proxy to backend)', () => {
    const result = apiUrl('/api/test');
    if (import.meta.env.DEV) {
      expect(result).toBe('/api/test');
    } else {
      expect(result).toMatch(/^https?:\/\//);
    }
  });
});
