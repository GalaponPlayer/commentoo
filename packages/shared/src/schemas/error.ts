import { z } from 'zod';

/**
 * Canonical API error codes. Kept centralized so the api emits and the clients
 * branch on the same set (CLAUDE.md: consistent error shape across boundaries).
 */
export const apiErrorCodeSchema = z.enum([
  'VALIDATION',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'RATE_LIMITED',
  'SESSION_NOT_LIVE',
  'CODE_COLLISION',
  'INTERNAL',
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/** Every error response has this shape: { error: { code, message } }. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
