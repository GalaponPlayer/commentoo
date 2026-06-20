import { z } from 'zod';

/** A comment is authored by a participant ('user') or the AI companion ('ai'). */
export const commentTypeSchema = z.enum(['user', 'ai']);
export type CommentType = z.infer<typeof commentTypeSchema>;

/**
 * Canonical Comment shape — the single source of truth shared across api, db
 * (via a row mapper), realtime (WSMessage payload), and the user app.
 * Timestamps cross the wire as ISO strings; the DB layer maps Date <-> string.
 */
export const commentSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  nickname: z.string(),
  content: z.string(),
  type: commentTypeSchema,
  parentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type Comment = z.infer<typeof commentSchema>;

export const COMMENT_NICKNAME_MAX = 40;
export const COMMENT_CONTENT_MAX = 500;

/**
 * Client-supplied fields when posting a comment. The server assigns
 * id / sessionId / type / createdAt — they are never accepted from the client.
 */
export const createCommentInputSchema = z.object({
  nickname: z.string().trim().min(1).max(COMMENT_NICKNAME_MAX),
  content: z.string().trim().min(1).max(COMMENT_CONTENT_MAX),
  parentId: z.string().uuid().nullable().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;
