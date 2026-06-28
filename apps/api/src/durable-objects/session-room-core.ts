import type { Comment, CreateCommentInput } from '@commentoo/shared';
import type { WSErrorPayload } from '@commentoo/realtime';

/**
 * Pure, dependency-injected core of the SessionRoom Durable Object.
 *
 * All Workers-specific concerns (WebSocket accept/hibernation, the real storage
 * and Neon client, the clock, the id generator, the broadcast fan-out) are
 * injected, so the broadcast-first / rate-limit / buffer / flush logic — the
 * riskiest part of Phase 1 — is unit-tested in plain Node without workerd or a DB.
 */

export const BUFFER_PREFIX = 'buf:';
export const RATE_LIMIT_PREFIX = 'rl:';

/** Minimal slice of DurableObjectStorage the core needs. */
export interface CoreStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  list<T>(options: { prefix: string }): Promise<Map<string, T>>;
  delete(keys: string[]): Promise<void>;
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number): Promise<void>;
}

/** Durable sink for batch-persisting comments (idempotent on id). */
export interface CommentSink {
  insertComments(comments: Comment[]): Promise<void>;
}

export interface SessionRoomCoreDeps {
  storage: CoreStorage;
  sink: CommentSink;
  /** Fan-out to every connected socket (incl. the poster's own). */
  broadcast: (comment: Comment) => void;
  now: () => number;
  newId: () => string;
  rateLimitMs: number;
  flushDelayMs: number;
  /** Delay before retrying a failed flush. Defaults to flushDelayMs. */
  flushRetryMs?: number;
}

export type PostResult = { ok: true; comment: Comment } | { ok: false; error: WSErrorPayload };

export class SessionRoomCore {
  private readonly deps: SessionRoomCoreDeps;

  constructor(deps: SessionRoomCoreDeps) {
    this.deps = deps;
  }

  /**
   * Broadcast-first write path: rate-check, assign id/timestamp, broadcast to all
   * sockets immediately, buffer in storage, then arm the flush alarm.
   */
  async handleIncomingComment(
    participantId: string,
    sessionId: string,
    input: CreateCommentInput,
  ): Promise<PostResult> {
    const { storage, broadcast, now, newId, rateLimitMs, flushDelayMs } = this.deps;

    const rateKey = `${RATE_LIMIT_PREFIX}${participantId}`;
    const last = await storage.get<number>(rateKey);
    const ts = now();
    if (last !== undefined && ts - last < rateLimitMs) {
      return {
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'You are posting too quickly. Please wait a moment.',
        },
      };
    }
    await storage.put(rateKey, ts);

    const comment: Comment = {
      id: newId(),
      sessionId,
      nickname: input.nickname,
      content: input.content,
      type: 'user',
      parentId: input.parentId ?? null,
      createdAt: new Date(ts).toISOString(),
    };

    broadcast(comment);
    await storage.put(`${BUFFER_PREFIX}${comment.id}`, comment);

    if ((await storage.getAlarm()) === null) {
      await storage.setAlarm(ts + flushDelayMs);
    }

    return { ok: true, comment };
  }

  /**
   * Drain the buffer to the durable sink. Buffer keys are deleted only after a
   * successful insert; on failure the alarm is re-armed so the batch is retried
   * (the insert is idempotent on the comment id, so retries never duplicate).
   */
  async flush(): Promise<void> {
    const { storage, sink, now, flushDelayMs, flushRetryMs } = this.deps;
    const entries = await storage.list<Comment>({ prefix: BUFFER_PREFIX });
    if (entries.size === 0) return;

    const keys = [...entries.keys()];
    const values = [...entries.values()];
    try {
      await sink.insertComments(values);
      await storage.delete(keys);
    } catch {
      await storage.setAlarm(now() + (flushRetryMs ?? flushDelayMs));
    }
  }
}
