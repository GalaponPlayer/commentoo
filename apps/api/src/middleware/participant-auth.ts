import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';
import { errorBody } from '../lib/errors.js';
import { verifyParticipantToken } from '../lib/participant-token.js';

/**
 * Require a valid participant token. Accepts it as `Authorization: Bearer <jwt>`
 * (REST) or `?token=<jwt>` (WS upgrade). On success, sets `c.var.participant`.
 */
export const participantAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length)
    : c.req.query('token');

  const claims = await verifyParticipantToken(c.env, token);
  if (!claims) {
    return c.json(errorBody('UNAUTHORIZED', 'A valid participant token is required.'), 401);
  }

  c.set('participant', claims);
  await next();
});
