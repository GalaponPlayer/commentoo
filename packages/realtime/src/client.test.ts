import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Comment } from '@commentoo/shared';
import {
  BACKOFF_CAP_MS,
  SessionRoomClient,
  computeBackoffDelay,
  type SessionRoomClientOptions,
} from './client.js';

/** Minimal driveable WebSocket double. */
class FakeWebSocket {
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev?: unknown) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  readyState = 0;
  sent: string[] = [];
  url: string;
  constructor(url: string) {
    this.url = url;
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }
  emitOpen(): void {
    this.readyState = 1;
    this.onopen?.(undefined);
  }
  emitMessage(data: string): void {
    this.onmessage?.({ data });
  }
}

function comment(id: string, content: string): Comment {
  return {
    id,
    sessionId: 's',
    nickname: 'n',
    content,
    type: 'user',
    parentId: null,
    createdAt: '2026-06-17T00:00:00.000Z',
  };
}

// UUIDv7 ids sort lexicographically by time; these stand in for that ordering.
const ID1 = '01900000-0000-7000-8000-000000000001';
const ID2 = '01900000-0000-7000-8000-000000000002';

function makeClient(overrides: Partial<SessionRoomClientOptions> = {}) {
  const sockets: FakeWebSocket[] = [];
  const received: Comment[] = [];
  const historyBatches: Comment[][] = [];
  let historyCall = 0;

  const opts: SessionRoomClientOptions = {
    apiBaseUrl: 'http://localhost:8787',
    sessionId: 's',
    code: 'ABC123',
    token: 'tok',
    onComment: (c) => received.push(c),
    webSocketFactory: (url) => {
      const ws = new FakeWebSocket(url);
      sockets.push(ws);
      return ws as unknown as WebSocket;
    },
    fetchFn: (async () => {
      const batch = historyBatches[historyCall++] ?? [];
      return new Response(JSON.stringify({ comments: batch }), { status: 200 });
    }) as typeof fetch,
    random: () => 1, // deterministic: backoff uses full ceiling
    ...overrides,
  };
  const client = new SessionRoomClient(opts);
  return { client, sockets, received, setHistory: (b: Comment[][]) => historyBatches.push(...b) };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('computeBackoffDelay', () => {
  it('grows exponentially and caps at 30s (full jitter = ceiling)', () => {
    const r = () => 1;
    expect(computeBackoffDelay(0, r)).toBe(500);
    expect(computeBackoffDelay(1, r)).toBe(1000);
    expect(computeBackoffDelay(2, r)).toBe(2000);
    expect(computeBackoffDelay(10, r)).toBe(BACKOFF_CAP_MS);
  });

  it('returns 0 with zero jitter', () => {
    expect(computeBackoffDelay(5, () => 0)).toBe(0);
  });
});

describe('SessionRoomClient connect + sync', () => {
  it('replays history then streams live, in order', async () => {
    const { client, sockets, received, setHistory } = makeClient();
    setHistory([[comment(ID1, 'first')]]);

    client.connect();
    expect(client.getState()).toBe('connecting');

    sockets[0].emitOpen();
    expect(client.getState()).toBe('syncing');
    await flush();

    expect(client.getState()).toBe('open');
    sockets[0].emitMessage(JSON.stringify({ type: 'comment:new', payload: comment(ID2, 'live') }));

    expect(received.map((c) => c.content)).toEqual(['first', 'live']);
    expect(client.getCursor()).toBe(ID2);
  });

  it('dedups a live comment that also appears in the history replay', async () => {
    const { client, sockets, received, setHistory } = makeClient();
    // History will include ID2; ID2 also streams in live during syncing.
    setHistory([[comment(ID1, 'first'), comment(ID2, 'second')]]);

    client.connect();
    sockets[0].emitOpen();
    // Live message arrives while still syncing (buffered).
    sockets[0].emitMessage(
      JSON.stringify({ type: 'comment:new', payload: comment(ID2, 'second') }),
    );
    await flush();

    expect(received.map((c) => c.id)).toEqual([ID1, ID2]); // ID2 applied once
  });

  it('post() is rejected until open, accepted once open', async () => {
    const { client, sockets } = makeClient();
    expect(client.post({ nickname: 'n', content: 'hi' })).toBe(false);

    client.connect();
    sockets[0].emitOpen();
    await flush();

    expect(client.post({ nickname: 'n', content: 'hi' })).toBe(true);
    expect(sockets[0].sent.some((s) => s.includes('comment:post'))).toBe(true);
  });
});

describe('SessionRoomClient reconnect', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reconnects with backoff after an unexpected close and resyncs from cursor', async () => {
    const { client, sockets, setHistory } = makeClient();
    setHistory([[comment(ID1, 'first')], [comment(ID2, 'gap')]]);

    client.connect();
    sockets[0].emitOpen();
    await vi.advanceTimersByTimeAsync(0); // resolve replay
    expect(client.getState()).toBe('open');
    expect(client.getCursor()).toBe(ID1);

    sockets[0].close(); // server drops connection
    expect(client.getState()).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(BACKOFF_CAP_MS); // fire reconnect timer
    expect(sockets.length).toBe(2); // new socket opened

    sockets[1].emitOpen();
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getState()).toBe('open');
    // Second history call used the cursor (ID1) and replayed the gap (ID2).
    expect(client.getCursor()).toBe(ID2);
  });

  it('does not reconnect after an intentional close', { timeout: 10_000 }, async () => {
    const { client, sockets } = makeClient();
    client.connect();
    sockets[0].emitOpen();
    await vi.advanceTimersByTimeAsync(0);

    client.close();
    expect(client.getState()).toBe('closed');
    await vi.advanceTimersByTimeAsync(BACKOFF_CAP_MS);
    expect(sockets.length).toBe(1); // no reconnect attempt
  });
});
