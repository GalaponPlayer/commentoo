/**
 * WebSocket message protocol for real-time comment streaming.
 *
 * The canonical `Comment` shape lives in `@commentoo/shared` and is reused here
 * so the wire contract never drifts from the validated/persisted shape.
 */
import type { Comment, CreateCommentInput, SessionStatus } from '@commentoo/shared';

export type { Comment, CreateCommentInput, SessionStatus };

export interface SessionStatusPayload {
  sessionId: string;
  status: SessionStatus;
}

export interface WSErrorPayload {
  code: string;
  message: string;
}

/** Messages the server sends to clients. */
export type ServerMessage =
  | { type: 'comment:new'; payload: Comment }
  | { type: 'comment:list'; payload: Comment[] }
  | { type: 'session:status'; payload: SessionStatusPayload }
  | { type: 'error'; payload: WSErrorPayload }
  | { type: 'pong' };

/** Messages a client sends to the server. */
export type ClientMessage =
  | { type: 'comment:post'; payload: CreateCommentInput }
  | { type: 'ping' };

/** Either direction — useful for exhaustive parsing on the DO side. */
export type WSMessage = ServerMessage | ClientMessage;
