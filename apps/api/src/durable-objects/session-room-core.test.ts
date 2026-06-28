import { describe, expect, it, vi } from 'vitest';
import type { Comment } from '@commentoo/shared';
import {
  BUFFER_PREFIX,
  SessionRoomCore,
  type CommentSink,
  type CoreStorage,
  type SessionRoomCoreDeps,
} from './session-room-core.js';

class FakeStorage implements CoreStorage {
  map = new Map<string, unknown>();
  alarm: number | null = null;
  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }
  async put<T>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }
  async list<T>({ prefix }: { prefix: string }): Promise<Map<string, T>> {
    const out = new Map<string, T>();
    for (const [k, v] of this.map) if (k.startsWith(prefix)) out.set(k, v as T);
    return out;
  }
  async delete(keys: string[]): Promise<void> {
    for (const k of keys) this.map.delete(k);
  }
  async getAlarm(): Promise<number | null> {
    return this.alarm;
  }
  async setAlarm(t: number): Promise<void> {
    this.alarm = t;
  }
}

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const INPUT = { nickname: '青いペンギン', content: 'こんにちは' };

function setup(overrides: Partial<SessionRoomCoreDeps> = {}) {
  const storage = new FakeStorage();
  const broadcast = vi.fn<(c: Comment) => void>();
  const sink: CommentSink = { insertComments: vi.fn(async () => {}) };
  let id = 0;
  const deps: SessionRoomCoreDeps = {
    storage,
    sink,
    broadcast,
    now: () => 10_000,
    newId: () => `id-${(id += 1)}`,
    rateLimitMs: 3000,
    flushDelayMs: 1000,
    flushRetryMs: 5000,
    ...overrides,
  };
  return { core: new SessionRoomCore(deps), storage, broadcast, sink };
}

describe('handleIncomingComment', () => {
  it('broadcasts, buffers, arms the alarm, and returns the assembled comment', async () => {
    const { core, storage, broadcast } = setup();
    const result = await core.handleIncomingComment('p1', SESSION_ID, INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.comment).toMatchObject({
      id: 'id-1',
      sessionId: SESSION_ID,
      nickname: INPUT.nickname,
      content: INPUT.content,
      type: 'user',
      parentId: null,
      createdAt: new Date(10_000).toISOString(),
    });
    expect(broadcast).toHaveBeenCalledWith(result.comment);
    expect(await storage.get(`${BUFFER_PREFIX}id-1`)).toEqual(result.comment);
    expect(storage.alarm).toBe(11_000); // now + flushDelayMs
  });

  it('rate-limits a second post within the window (no broadcast, no buffer)', async () => {
    const { core, storage, broadcast } = setup();
    await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    broadcast.mockClear();

    const result = await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('RATE_LIMITED');
    expect(broadcast).not.toHaveBeenCalled();
    expect((await storage.list({ prefix: BUFFER_PREFIX })).size).toBe(1);
  });

  it('allows a second post after the rate-limit window elapses', async () => {
    let t = 10_000;
    const { core } = setup({ now: () => t });
    await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    t = 13_500; // > rateLimitMs later
    const result = await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    expect(result.ok).toBe(true);
  });

  it('rate-limits per participant, not globally', async () => {
    const { core } = setup();
    await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    const other = await core.handleIncomingComment('p2', SESSION_ID, INPUT);
    expect(other.ok).toBe(true);
  });

  it('does not reset an already-pending alarm', async () => {
    let t = 10_000;
    const { core, storage } = setup({ now: () => t, rateLimitMs: 0 });
    await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    expect(storage.alarm).toBe(11_000);
    t = 10_500;
    await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    expect(storage.alarm).toBe(11_000); // unchanged
  });
});

describe('flush', () => {
  it('persists buffered comments then clears them', async () => {
    const { core, storage, sink } = setup({ rateLimitMs: 0 });
    await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    await core.handleIncomingComment('p1', SESSION_ID, INPUT);

    await core.flush();

    expect(sink.insertComments).toHaveBeenCalledOnce();
    const inserted = vi.mocked(sink.insertComments).mock.calls[0]![0];
    expect(inserted).toHaveLength(2);
    expect((await storage.list({ prefix: BUFFER_PREFIX })).size).toBe(0);
  });

  it('keeps the buffer and re-arms the alarm when the sink fails', async () => {
    const sink: CommentSink = {
      insertComments: vi.fn(async () => Promise.reject(new Error('neon down'))),
    };
    const { core, storage } = setup({ rateLimitMs: 0, sink });
    await core.handleIncomingComment('p1', SESSION_ID, INPUT);
    storage.alarm = null; // simulate alarm consumed before firing

    await core.flush();

    expect((await storage.list({ prefix: BUFFER_PREFIX })).size).toBe(1); // retained
    expect(storage.alarm).toBe(15_000); // now + flushRetryMs
  });

  it('is a no-op with an empty buffer', async () => {
    const { core, sink } = setup();
    await core.flush();
    expect(sink.insertComments).not.toHaveBeenCalled();
  });
});
