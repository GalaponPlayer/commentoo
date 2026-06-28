import { describe, expect, it } from 'vitest';
import type { Env } from '../types.js';
import { issueParticipantToken, verifyParticipantToken } from './participant-token.js';

const env = {
  PARTICIPANT_TOKEN_SECRET: 'test-secret-please-ignore',
  PARTICIPANT_TOKEN_TTL_SECONDS: '3600',
} as Env;

const claims = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  participantId: '22222222-2222-4222-8222-222222222222',
  code: 'ABC234',
};

describe('participant token', () => {
  it('round-trips: issue then verify yields the same claims', async () => {
    const { token, exp } = await issueParticipantToken(env, claims);
    const verified = await verifyParticipantToken(env, token);
    expect(verified).toMatchObject(claims);
    expect(verified?.exp).toBe(exp);
  });

  it('rejects a tampered token', async () => {
    const { token } = await issueParticipantToken(env, claims);
    const tampered = `${token.slice(0, -2)}xx`;
    expect(await verifyParticipantToken(env, tampered)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await issueParticipantToken(env, claims);
    const otherEnv = { ...env, PARTICIPANT_TOKEN_SECRET: 'different-secret' } as Env;
    expect(await verifyParticipantToken(otherEnv, token)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const past = () => Date.now() - 7200 * 1000; // issued 2h ago, 1h ttl
    const { token } = await issueParticipantToken(env, claims, past);
    expect(await verifyParticipantToken(env, token)).toBeNull();
  });

  it('returns null for a missing token', async () => {
    expect(await verifyParticipantToken(env, undefined)).toBeNull();
    expect(await verifyParticipantToken(env, '')).toBeNull();
  });
});
