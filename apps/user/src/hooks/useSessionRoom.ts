'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Comment, CreateCommentInput } from '@commentoo/shared';
import type { WSErrorPayload } from '@commentoo/realtime';
import { SessionRoomClient, type ConnectionState } from '@commentoo/realtime/client';
import { API_BASE_URL } from '../lib/api';

export interface UseSessionRoomArgs {
  sessionId: string;
  code: string;
  token: string;
  apiBaseUrl?: string;
}

export interface UseSessionRoomResult {
  comments: Comment[];
  connectionState: ConnectionState;
  error: WSErrorPayload | null;
  post: (input: CreateCommentInput) => boolean;
}

/**
 * React wrapper over the framework-agnostic SessionRoomClient. Owns the comment
 * list + connection state; the client handles reconnect, backoff and cursor
 * delta-sync (and dedups by id, so appends here are always unique).
 */
export function useSessionRoom({
  sessionId,
  code,
  token,
  apiBaseUrl = API_BASE_URL,
}: UseSessionRoomArgs): UseSessionRoomResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<WSErrorPayload | null>(null);
  const clientRef = useRef<SessionRoomClient | null>(null);

  useEffect(() => {
    const client = new SessionRoomClient({
      apiBaseUrl,
      sessionId,
      code,
      token,
      onComment: (comment) => setComments((prev) => [...prev, comment]),
      onStateChange: setConnectionState,
      onError: setError,
    });
    clientRef.current = client;
    client.connect();

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [sessionId, code, token, apiBaseUrl]);

  const post = useCallback((input: CreateCommentInput) => {
    return clientRef.current?.post(input) ?? false;
  }, []);

  return { comments, connectionState, error, post };
}
