import { comments, sessions } from '@commentoo/db';
import {
  createCommentInputSchema,
  createSessionInputSchema,
  joinCodeSchema,
  type ApiError,
  type Comment,
  type JoinResponse,
} from '@commentoo/shared';
import { and, asc, eq, gt, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateJoinCode, withCodeCollisionRetry } from '../lib/codes.js';
import { getDb } from '../lib/db.js';
import { ERROR_STATUS, errorBody } from '../lib/errors.js';
import { rowToComment, rowToSession } from '../lib/mappers.js';
import { issueParticipantToken, verifyParticipantToken } from '../lib/participant-token.js';
import { participantAuth } from '../middleware/participant-auth.js';
import type { AppEnv } from '../types.js';

const uuidSchema = z.string().uuid();
const HISTORY_PAGE_SIZE = 200;

/** Postgres unique-violation (used to retry on a join-code collision). */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: string; message?: string };
  return e.code === '23505' || (e.message?.includes('duplicate key') ?? false);
}

export const sessionsRouter = new Hono<AppEnv>();

// POST /api/sessions — create a session (Phase 1: starts live; no admin yet).
sessionsRouter.post('/', async (c) => {
  const parsed = createSessionInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(errorBody('VALIDATION', 'A session title is required.'), ERROR_STATUS.VALIDATION);
  }

  const db = getDb(c.env);
  try {
    const row = await withCodeCollisionRetry(async () => {
      const [inserted] = await db
        .insert(sessions)
        .values({ code: generateJoinCode(), title: parsed.data.title, status: 'live' })
        .returning();
      return inserted!;
    }, isUniqueViolation);
    return c.json(rowToSession(row), 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json(
        errorBody('CODE_COLLISION', 'Could not allocate a unique join code; try again.'),
        ERROR_STATUS.CODE_COLLISION,
      );
    }
    throw error;
  }
});

// GET /api/sessions/:code — public session info by join code.
sessionsRouter.get('/:code', async (c) => {
  const code = c.req.param('code');
  if (!joinCodeSchema.safeParse(code).success) {
    return c.json(errorBody('VALIDATION', 'Invalid join code.'), ERROR_STATUS.VALIDATION);
  }

  const db = getDb(c.env);
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.code, code), ne(sessions.status, 'archived')))
    .limit(1);
  if (!row) return c.json(errorBody('NOT_FOUND', 'Session not found.'), ERROR_STATUS.NOT_FOUND);

  return c.json(rowToSession(row));
});

// POST /api/sessions/:code/join — issue an anonymous participant token (no DB write).
sessionsRouter.post('/:code/join', async (c) => {
  const code = c.req.param('code');
  if (!joinCodeSchema.safeParse(code).success) {
    return c.json(errorBody('VALIDATION', 'Invalid join code.'), ERROR_STATUS.VALIDATION);
  }

  const db = getDb(c.env);
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.code, code), ne(sessions.status, 'archived')))
    .limit(1);
  if (!row) return c.json(errorBody('NOT_FOUND', 'Session not found.'), ERROR_STATUS.NOT_FOUND);
  if (row.status === 'ended') {
    return c.json(
      errorBody('SESSION_NOT_LIVE', 'This session has ended.'),
      ERROR_STATUS.SESSION_NOT_LIVE,
    );
  }

  const participantId = crypto.randomUUID();
  const { token, exp } = await issueParticipantToken(c.env, {
    sessionId: row.id,
    participantId,
    code,
  });
  const body: JoinResponse = {
    token,
    sessionId: row.id,
    participantId,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
  return c.json(body, 201);
});

// POST /api/sessions/:id/comments — post a comment (forwarded to the DO write authority).
sessionsRouter.post('/:id/comments', participantAuth, async (c) => {
  const id = c.req.param('id');
  const claims = c.get('participant');
  if (claims.sessionId !== id) {
    return c.json(
      errorBody('UNAUTHORIZED', 'Token does not match this session.'),
      ERROR_STATUS.UNAUTHORIZED,
    );
  }

  const parsed = createCommentInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(errorBody('VALIDATION', 'Invalid comment.'), ERROR_STATUS.VALIDATION);
  }

  const stub = c.env.SESSION_ROOM.get(c.env.SESSION_ROOM.idFromName(claims.sessionId));
  const res = await stub.fetch('https://session-room/post', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      participantId: claims.participantId,
      sessionId: claims.sessionId,
      input: parsed.data,
    }),
  });
  const data = (await res.json()) as { comment: Comment } | ApiError;
  if (!res.ok) return c.json(data as ApiError, res.status as 400 | 401 | 429 | 500);
  return c.json((data as { comment: Comment }).comment, 201);
});

// GET /api/sessions/:id/comments?after=<id> — history + reconnection delta-sync.
// Cursor is the last comment id; UUIDv7 is time-sortable, so `id > after` is a
// correct keyset over creation order without a separate cursor-row lookup.
sessionsRouter.get('/:id/comments', async (c) => {
  const id = c.req.param('id');
  if (!uuidSchema.safeParse(id).success) {
    return c.json(errorBody('VALIDATION', 'Invalid session id.'), ERROR_STATUS.VALIDATION);
  }

  const after = c.req.query('after');
  const cursorValid = after !== undefined && uuidSchema.safeParse(after).success;
  const where = cursorValid
    ? and(eq(comments.sessionId, id), gt(comments.id, after))
    : eq(comments.sessionId, id);

  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(comments)
    .where(where)
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .limit(HISTORY_PAGE_SIZE);

  return c.json({ comments: rows.map(rowToComment) });
});

// GET /api/sessions/:code/ws — WebSocket upgrade, forwarded to the SessionRoom DO.
sessionsRouter.get('/:code/ws', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json(
      errorBody('VALIDATION', 'Expected a WebSocket upgrade.'),
      ERROR_STATUS.VALIDATION,
    );
  }

  // Reject cross-origin browser upgrades (WS skips CORS preflight).
  const origin = c.req.header('Origin');
  if (origin && origin !== c.env.USER_APP_ORIGIN) {
    return c.json(errorBody('UNAUTHORIZED', 'Origin not allowed.'), ERROR_STATUS.UNAUTHORIZED);
  }

  // Early auth check; the DO re-verifies authoritatively from the token query.
  const claims = await verifyParticipantToken(c.env, c.req.query('token'));
  if (!claims || claims.code !== c.req.param('code')) {
    return c.json(errorBody('UNAUTHORIZED', 'A valid participant token is required.'), 401);
  }

  const stub = c.env.SESSION_ROOM.get(c.env.SESSION_ROOM.idFromName(claims.sessionId));
  return stub.fetch(c.req.raw);
});
