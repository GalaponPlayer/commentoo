import { participantTokenClaimsSchema, type ParticipantTokenClaims } from '@commentoo/shared';
import { sign, verify } from 'hono/jwt';
import type { Env } from '../types.js';

const DEFAULT_TTL_SECONDS = 21_600; // 6h
const ALG = 'HS256' as const;

export interface IssuedToken {
  token: string;
  /** Expiry as a Unix timestamp (seconds). */
  exp: number;
}

/**
 * Issue a short-lived signed participant token (HS256). The token is the single
 * credential for WS connect + comment posting; `code` is embedded so the comment
 * route can resolve the SessionRoom DO without a DB lookup.
 */
export async function issueParticipantToken(
  env: Env,
  claims: Pick<ParticipantTokenClaims, 'sessionId' | 'participantId' | 'code'>,
  now: () => number = Date.now,
): Promise<IssuedToken> {
  const ttl = Number(env.PARTICIPANT_TOKEN_TTL_SECONDS) || DEFAULT_TTL_SECONDS;
  const exp = Math.floor(now() / 1000) + ttl;
  const payload = { ...claims, exp };
  const token = await sign(payload, env.PARTICIPANT_TOKEN_SECRET, ALG);
  return { token, exp };
}

/**
 * Verify a participant token. Returns the validated claims, or null if the token
 * is missing/invalid/expired or its payload does not match the claims schema.
 */
export async function verifyParticipantToken(
  env: Env,
  token: string | undefined | null,
): Promise<ParticipantTokenClaims | null> {
  if (!token) return null;
  try {
    const payload = await verify(token, env.PARTICIPANT_TOKEN_SECRET, ALG);
    const parsed = participantTokenClaimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
