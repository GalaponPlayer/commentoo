import { describe, expect, it } from 'vitest';
import { createDb } from './index.js';

describe('createDb', () => {
  it('builds a drizzle client from a connection string without connecting', () => {
    // neon() parses the URL lazily — no network call until a query runs.
    const db = createDb('postgresql://user:pass@host/db');

    expect(db).toBeDefined();
    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
  });
});
