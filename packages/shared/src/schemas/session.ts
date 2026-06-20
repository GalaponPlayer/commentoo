import { z } from 'zod';

/**
 * Session lifecycle. A 6-char join `code` is unique among non-archived sessions
 * (partial unique index in the db schema), so codes are recycled after archive.
 */
export const sessionStatusSchema = z.enum(['preparing', 'live', 'ended', 'archived']);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  status: sessionStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Session = z.infer<typeof sessionSchema>;

export const SESSION_TITLE_MAX = 120;

export const createSessionInputSchema = z.object({
  title: z.string().trim().min(1).max(SESSION_TITLE_MAX),
});
export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

/** Join codes are 6 uppercase alphanumerics (ambiguous chars excluded on generation). */
export const JOIN_CODE_LENGTH = 6;
export const joinCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, 'invalid join code');
