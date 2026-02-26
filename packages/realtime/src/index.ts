/** WebSocket message types for real-time communication */

export interface CommentPayload {
  id: string;
  sessionId: string;
  nickname: string;
  content: string;
  type: 'user' | 'ai';
  parentId: string | null;
  createdAt: string;
}

export interface SessionStatusPayload {
  sessionId: string;
  status: 'preparing' | 'live' | 'ended' | 'archived';
}

export type WSMessage =
  | { type: 'comment:new'; payload: CommentPayload }
  | { type: 'comment:list'; payload: CommentPayload[] }
  | { type: 'session:status'; payload: SessionStatusPayload }
  | { type: 'ping' }
  | { type: 'pong' };
