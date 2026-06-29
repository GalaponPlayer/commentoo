import { describe, expect, it, vi } from 'vitest';
import type { Comment, Session } from '@commentoo/shared';
import { ApiClientError, createApiClient } from './api';

const SESSION: Session = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'ABC234',
  title: 'デモセッション',
  status: 'live',
  createdAt: '2026-06-17T00:00:00.000Z',
  updatedAt: '2026-06-17T00:00:00.000Z',
};

const COMMENT: Comment = {
  id: '01900000-0000-7000-8000-000000000001',
  sessionId: SESSION.id,
  nickname: '青いペンギン',
  content: 'こんにちは',
  type: 'user',
  parentId: null,
  createdAt: '2026-06-17T00:00:01.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function clientWith(fetchFn: typeof fetch) {
  return createApiClient({ baseUrl: 'http://api.test', fetchFn });
}

describe('apiClient', () => {
  it('getSession parses and returns a validated session', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(SESSION));
    await expect(clientWith(fetchMock).getSession('ABC234')).resolves.toEqual(SESSION);
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/sessions/ABC234', {
      method: 'GET',
    });
  });

  it('postComment sends the bearer token and body', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(COMMENT, 201));
    const result = await clientWith(fetchMock).postComment({
      sessionId: SESSION.id,
      token: 'tok',
      input: { nickname: '青いペンギン', content: 'こんにちは' },
    });
    expect(result).toEqual(COMMENT);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ authorization: 'Bearer tok' });
  });

  it('listComments unwraps the comments array and forwards the cursor', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ comments: [COMMENT] }));
    const result = await clientWith(fetchMock).listComments(SESSION.id, COMMENT.id);
    expect(result).toEqual([COMMENT]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      `?after=${encodeURIComponent(COMMENT.id)}`,
    );
  });

  it('throws ApiClientError carrying the canonical code on an error response', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Session not found.' } }, 404),
    );
    await expect(clientWith(fetchMock).getSession('ZZZZZZ')).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('maps a network failure to a NETWORK error', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError('offline');
    });
    await expect(clientWith(fetchMock).getSession('ABC234')).rejects.toBeInstanceOf(ApiClientError);
  });
});
