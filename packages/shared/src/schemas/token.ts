import { z } from 'zod';

/**
 * Claims carried by the anonymous participant token (a short-lived signed JWT).
 * `code` is included so the API can resolve the SessionRoom Durable Object on
 * each comment post without an extra DB lookup. `exp` is a Unix timestamp (s).
 */
export const participantTokenClaimsSchema = z.object({
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  code: z.string(),
  exp: z.number().int(),
});
export type ParticipantTokenClaims = z.infer<typeof participantTokenClaimsSchema>;

/** Response body of POST /api/sessions/:code/join. */
export const joinResponseSchema = z.object({
  token: z.string(),
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  expiresAt: z.string().datetime(),
});
export type JoinResponse = z.infer<typeof joinResponseSchema>;
