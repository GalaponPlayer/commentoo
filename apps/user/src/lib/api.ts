import {
  commentSchema,
  joinResponseSchema,
  sessionSchema,
  apiErrorSchema,
  type Comment,
  type CreateCommentInput,
  type JoinResponse,
  type Session,
} from '@commentoo/shared';
import { z } from 'zod';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/** Error thrown by the API client; `code` is the canonical API error code or a transport code. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

const commentListSchema = z.object({ comments: z.array(commentSchema) });

export interface ApiClientOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface ApiClient {
  getSession(code: string): Promise<Session>;
  joinSession(code: string): Promise<JoinResponse>;
  postComment(args: {
    sessionId: string;
    token: string;
    input: CreateCommentInput;
  }): Promise<Comment>;
  listComments(sessionId: string, after?: string): Promise<Comment[]>;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = (options.baseUrl ?? API_BASE_URL).replace(/\/$/, '');
  const fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function request<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let res: Response;
    try {
      res = await fetchFn(`${baseUrl}${path}`, init);
    } catch {
      throw new ApiClientError('NETWORK', 'ネットワークエラーが発生しました。');
    }

    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const parsed = apiErrorSchema.safeParse(data);
      throw new ApiClientError(
        parsed.success ? parsed.data.error.code : 'UNKNOWN',
        parsed.success ? parsed.data.error.message : `Request failed (${res.status}).`,
        res.status,
      );
    }

    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ApiClientError(
        'UNKNOWN',
        'サーバーから予期しない応答を受け取りました。',
        res.status,
      );
    }
    return result.data;
  }

  return {
    getSession(code) {
      return request(`/api/sessions/${code}`, { method: 'GET' }, sessionSchema);
    },
    joinSession(code) {
      return request(`/api/sessions/${code}/join`, { method: 'POST' }, joinResponseSchema);
    },
    async postComment({ sessionId, token, input }) {
      return request(
        `/api/sessions/${sessionId}/comments`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify(input),
        },
        commentSchema,
      );
    },
    async listComments(sessionId, after) {
      const query = after ? `?after=${encodeURIComponent(after)}` : '';
      const body = await request(
        `/api/sessions/${sessionId}/comments${query}`,
        { method: 'GET' },
        commentListSchema,
      );
      return body.comments;
    },
  };
}

/** Default client bound to NEXT_PUBLIC_API_URL. */
export const apiClient = createApiClient();
