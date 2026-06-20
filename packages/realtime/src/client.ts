/**
 * Framework-agnostic WebSocket client for a SessionRoom.
 *
 * Responsibilities (Phase 1, plan §PR1):
 *  - connect/reconnect with exponential backoff + full jitter
 *  - heartbeat ping/pong to detect dead connections
 *  - cursor-based delta-sync: on every (re)connect, replay the gap from the REST
 *    history endpoint before resuming the live stream
 *  - dedup: comment ids are UUIDv7 (time-sortable), so a comment is applied only
 *    when its id sorts after the last applied id — this is O(1) and also resolves
 *    the overlap between REST replay and buffered live messages.
 *
 * WebSocket/fetch are injectable so the logic is unit-testable without a browser.
 */
import type { Comment } from '@commentoo/shared';
import type {
  ClientMessage,
  CreateCommentInput,
  ServerMessage,
  SessionStatusPayload,
  WSErrorPayload,
} from './index.js';

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'syncing'
  | 'open'
  | 'reconnecting'
  | 'closed';

export const BACKOFF_BASE_MS = 500;
export const BACKOFF_CAP_MS = 30_000;
export const HEARTBEAT_INTERVAL_MS = 25_000;
export const HEARTBEAT_TIMEOUT_MS = 10_000;

/** Exponential backoff with full jitter. Pure and exported for testing. */
export function computeBackoffDelay(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
  return Math.round(random() * ceiling);
}

export interface SessionRoomClientOptions {
  /** API origin, e.g. "http://localhost:8787". WS URL is derived (http→ws). */
  apiBaseUrl: string;
  sessionId: string;
  code: string;
  token: string;
  onComment: (comment: Comment) => void;
  onStatus?: (status: SessionStatusPayload) => void;
  onError?: (error: WSErrorPayload) => void;
  onStateChange?: (state: ConnectionState) => void;
  /** Resume from a known cursor (last applied comment id). */
  initialCursor?: string;
  /** Injectables for testing. */
  webSocketFactory?: (url: string) => WebSocket;
  fetchFn?: typeof fetch;
  random?: () => number;
}

interface CommentListResponse {
  comments: Comment[];
}

export class SessionRoomClient {
  private readonly opts: SessionRoomClientOptions;
  private readonly wsFactory: (url: string) => WebSocket;
  private readonly fetchFn: typeof fetch;
  private readonly random: () => number;

  private ws: WebSocket | null = null;
  private state: ConnectionState = 'idle';
  private attempt = 0;
  private lastCommentId: string | undefined;
  private closedByUser = false;

  /** Live comments that arrive before the REST gap-replay finishes. */
  private pendingLive: Comment[] = [];

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: SessionRoomClientOptions) {
    this.opts = opts;
    this.wsFactory = opts.webSocketFactory ?? ((url) => new WebSocket(url));
    this.fetchFn = opts.fetchFn ?? ((...args) => fetch(...args));
    this.random = opts.random ?? Math.random;
    this.lastCommentId = opts.initialCursor;
  }

  getState(): ConnectionState {
    return this.state;
  }

  /** Last applied comment id — the resync cursor. */
  getCursor(): string | undefined {
    return this.lastCommentId;
  }

  connect(): void {
    if (this.state === 'connecting' || this.state === 'syncing' || this.state === 'open') return;
    this.closedByUser = false;
    this.openSocket();
  }

  close(): void {
    this.closedByUser = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.onopen = this.ws.onclose = this.ws.onerror = this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.setState('closed');
  }

  /** Send a comment. Returns false if the socket is not open. */
  post(input: CreateCommentInput): boolean {
    if (!this.ws || this.state !== 'open') return false;
    this.send({ type: 'comment:post', payload: input });
    return true;
  }

  // --- internals -----------------------------------------------------------

  private wsUrl(): string {
    const base = this.opts.apiBaseUrl.replace(/^http/, 'ws').replace(/\/$/, '');
    const token = encodeURIComponent(this.opts.token);
    return `${base}/api/sessions/${this.opts.code}/ws?token=${token}`;
  }

  private historyUrl(): string {
    const base = this.opts.apiBaseUrl.replace(/\/$/, '');
    const url = `${base}/api/sessions/${this.opts.sessionId}/comments`;
    return this.lastCommentId ? `${url}?after=${encodeURIComponent(this.lastCommentId)}` : url;
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.opts.onStateChange?.(state);
  }

  private openSocket(): void {
    this.setState(this.attempt === 0 ? 'connecting' : 'reconnecting');
    this.pendingLive = [];
    const ws = this.wsFactory(this.wsUrl());
    this.ws = ws;
    ws.onopen = () => void this.onOpen();
    ws.onmessage = (ev: MessageEvent) => this.onMessage(ev.data);
    ws.onclose = () => this.onClose();
    ws.onerror = () => this.onClose();
  }

  private async onOpen(): Promise<void> {
    this.setState('syncing');
    this.startHeartbeat();
    try {
      await this.replayGap();
    } catch {
      // History replay failed — drop the socket and let backoff retry.
      this.onClose();
      return;
    }
    // Flush comments that streamed in during the replay, then go live.
    for (const c of this.pendingLive) this.applyComment(c);
    this.pendingLive = [];
    this.attempt = 0;
    this.setState('open');
  }

  private async replayGap(): Promise<void> {
    const res = await this.fetchFn(this.historyUrl());
    if (!res.ok) throw new Error(`history ${res.status}`);
    const body = (await res.json()) as CommentListResponse;
    for (const c of body.comments) this.applyComment(c);
  }

  /** Apply a comment iff it sorts after the last applied id (dedup + ordering). */
  private applyComment(comment: Comment): void {
    if (this.lastCommentId !== undefined && comment.id <= this.lastCommentId) return;
    this.lastCommentId = comment.id;
    this.opts.onComment(comment);
  }

  private onMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    switch (msg.type) {
      case 'comment:new':
        if (this.state === 'syncing') this.pendingLive.push(msg.payload);
        else this.applyComment(msg.payload);
        break;
      case 'comment:list':
        for (const c of msg.payload) {
          if (this.state === 'syncing') this.pendingLive.push(c);
          else this.applyComment(c);
        }
        break;
      case 'session:status':
        this.opts.onStatus?.(msg.payload);
        break;
      case 'error':
        this.opts.onError?.(msg.payload);
        break;
      case 'pong':
        this.clearPongTimer();
        break;
    }
  }

  private onClose(): void {
    this.clearTimers();
    if (this.ws) {
      this.ws.onopen = this.ws.onclose = this.ws.onerror = this.ws.onmessage = null;
      this.ws = null;
    }
    if (this.closedByUser) return;
    const delay = computeBackoffDelay(this.attempt, this.random);
    this.attempt += 1;
    this.setState('reconnecting');
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  private send(msg: ClientMessage): void {
    this.ws?.send(JSON.stringify(msg));
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
      this.pongTimer = setTimeout(() => {
        // No pong in time — assume a dead connection and force a reconnect.
        this.ws?.close();
      }, HEARTBEAT_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  private clearPongTimer(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimer();
  }
}
