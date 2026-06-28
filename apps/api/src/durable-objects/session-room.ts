import { comments } from '@commentoo/db';
import {
  createCommentInputSchema,
  type ApiErrorCode,
  type Comment,
  type CreateCommentInput,
} from '@commentoo/shared';
import type { ClientMessage, ServerMessage } from '@commentoo/realtime';
import { getDb } from '../lib/db.js';
import { ERROR_STATUS, errorBody } from '../lib/errors.js';
import { commentToRow } from '../lib/mappers.js';
import { verifyParticipantToken } from '../lib/participant-token.js';
import { createUuidv7 } from '../lib/uuidv7.js';
import type { Env } from '../types.js';
import { SessionRoomCore, type CommentSink, type CoreStorage } from './session-room-core.js';

/** Per-socket data persisted across hibernation via serializeAttachment. */
interface SocketAttachment {
  participantId: string;
  sessionId: string;
}

/**
 * Per-session WebSocket room. Uses the Hibernation API so idle connections do not
 * accrue duration billing — all state lives in storage / socket attachments and
 * survives eviction. Real logic lives in the injectable SessionRoomCore; this
 * class is the thin Workers-API wiring.
 */
export class SessionRoom implements DurableObject {
  private readonly ctx: DurableObjectState;
  private readonly env: Env;
  private readonly core: SessionRoomCore;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;

    const storage: CoreStorage = {
      get: <T>(key: string) => ctx.storage.get<T>(key),
      put: <T>(key: string, value: T) => ctx.storage.put<T>(key, value),
      list: <T>(options: { prefix: string }) => ctx.storage.list<T>(options),
      delete: async (keys: string[]) => {
        await ctx.storage.delete(keys);
      },
      getAlarm: () => ctx.storage.getAlarm(),
      setAlarm: (scheduledTime: number) => ctx.storage.setAlarm(scheduledTime),
    };

    const sink: CommentSink = {
      insertComments: async (batch: Comment[]) => {
        const db = getDb(env);
        await db.insert(comments).values(batch.map(commentToRow)).onConflictDoNothing();
      },
    };

    this.core = new SessionRoomCore({
      storage,
      sink,
      broadcast: (comment) => this.broadcast(comment),
      now: Date.now,
      // Per-instance monotonic generator; the DO is single-threaded per session.
      newId: createUuidv7(),
      rateLimitMs: Number(env.COMMENT_RATE_LIMIT_SECONDS) * 1000 || 3000,
      flushDelayMs: Number(env.COMMENT_FLUSH_DELAY_MS) || 1000,
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const claims = await verifyParticipantToken(this.env, url.searchParams.get('token'));
      if (!claims) return new Response('unauthorized', { status: 401 });

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server, [claims.participantId]);
      server.serializeAttachment({
        participantId: claims.participantId,
        sessionId: claims.sessionId,
      } satisfies SocketAttachment);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/post' && request.method === 'POST') {
      const body = (await request.json()) as {
        participantId: string;
        sessionId: string;
        input: CreateCommentInput;
      };
      const parsed = createCommentInputSchema.safeParse(body.input);
      if (!parsed.success) {
        return Response.json(errorBody('VALIDATION', 'Invalid comment.'), { status: 400 });
      }
      const result = await this.core.handleIncomingComment(
        body.participantId,
        body.sessionId,
        parsed.data,
      );
      if (!result.ok) {
        const code = result.error.code as ApiErrorCode;
        return Response.json(errorBody(code, result.error.message), { status: ERROR_STATUS[code] });
      }
      return Response.json({ comment: result.comment }, { status: 201 });
    }

    return new Response('not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' } satisfies ServerMessage));
      return;
    }

    if (msg.type === 'comment:post') {
      const att = ws.deserializeAttachment() as SocketAttachment | null;
      if (!att) {
        this.sendError(ws, 'UNAUTHORIZED', 'Connection is not authenticated.');
        return;
      }
      const parsed = createCommentInputSchema.safeParse(msg.payload);
      if (!parsed.success) {
        this.sendError(ws, 'VALIDATION', 'Invalid comment.');
        return;
      }
      const result = await this.core.handleIncomingComment(
        att.participantId,
        att.sessionId,
        parsed.data,
      );
      if (!result.ok)
        ws.send(JSON.stringify({ type: 'error', payload: result.error } satisfies ServerMessage));
      // On success the comment was already broadcast to every socket, including this one.
    }
  }

  webSocketClose(ws: WebSocket, code: number, _reason: string, _wasClean: boolean): void {
    // Complete the close handshake. Reserved codes (e.g. 1006) can't be echoed.
    try {
      ws.close(code >= 1000 && code < 5000 ? code : 1000);
    } catch {
      // already closing/closed
    }
  }

  webSocketError(_ws: WebSocket, error: unknown): void {
    console.error('SessionRoom websocket error', error);
  }

  async alarm(): Promise<void> {
    await this.core.flush();
  }

  private broadcast(comment: Comment): void {
    const message = JSON.stringify({
      type: 'comment:new',
      payload: comment,
    } satisfies ServerMessage);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
      } catch {
        // socket is closing; skip
      }
    }
  }

  private sendError(ws: WebSocket, code: ApiErrorCode, message: string): void {
    ws.send(JSON.stringify({ type: 'error', payload: { code, message } } satisfies ServerMessage));
  }
}
