import { describe, expect, it, vi } from 'vitest';
import { joinCodeSchema } from '@commentoo/shared';
import { JOIN_CODE_ALPHABET, generateJoinCode, withCodeCollisionRetry } from './codes.js';

describe('generateJoinCode', () => {
  it('produces a 6-char code from the unambiguous alphabet', () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(6);
    expect(joinCodeSchema.safeParse(code).success).toBe(true);
    for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
  });

  it('is deterministic with an injected randomInt', () => {
    expect(generateJoinCode(() => 0)).toBe('AAAAAA');
  });

  it('never emits ambiguous characters', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateJoinCode()).not.toMatch(/[0O1IL]/);
    }
  });
});

describe('withCodeCollisionRetry', () => {
  it('retries on collisions then succeeds', async () => {
    const attempt = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('dup'))
      .mockRejectedValueOnce(new Error('dup'))
      .mockResolvedValueOnce('OK');
    const result = await withCodeCollisionRetry(attempt, () => true);
    expect(result).toBe('OK');
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('rethrows immediately on a non-collision error', async () => {
    const attempt = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('fatal'));
    await expect(withCodeCollisionRetry(attempt, () => false)).rejects.toThrow('fatal');
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxAttempts collisions', async () => {
    const attempt = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('dup'));
    await expect(withCodeCollisionRetry(attempt, () => true, 3)).rejects.toThrow('dup');
    expect(attempt).toHaveBeenCalledTimes(3);
  });
});
