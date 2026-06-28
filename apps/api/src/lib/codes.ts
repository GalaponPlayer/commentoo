import { JOIN_CODE_LENGTH } from '@commentoo/shared';

/** Unambiguous alphabet — excludes 0/O/1/I/L to avoid read/transcription errors. */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Uniform random integer in [0, max) using rejection sampling over crypto bytes. */
function secureRandomInt(max: number): number {
  const limit = Math.floor(256 / max) * max; // largest multiple of max <= 256
  const buf = new Uint8Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= limit);
  return value % max;
}

/**
 * Generate a 6-char join code. `randomInt` is injectable for deterministic tests.
 */
export function generateJoinCode(randomInt: (max: number) => number = secureRandomInt): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Run `attempt` until it succeeds, retrying when it reports a code collision.
 * `isCollision` lets the caller classify a DB unique-violation as retryable.
 */
export async function withCodeCollisionRetry<T>(
  attempt: () => Promise<T>,
  isCollision: (error: unknown) => boolean,
  maxAttempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      return await attempt();
    } catch (error) {
      if (!isCollision(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
