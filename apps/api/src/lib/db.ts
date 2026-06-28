import { createDb, type Database } from '@commentoo/db';
import type { Env } from '../types.js';

/**
 * Build a Drizzle client for the request/DO. neon-http is stateless, so creating
 * one per call is cheap (no connection pool to reuse).
 */
export function getDb(env: Env): Database {
  return createDb(env.DATABASE_URL);
}
