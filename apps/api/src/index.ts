import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorBody } from './lib/errors.js';
import { sessionsRouter } from './routes/sessions.js';
import type { AppEnv } from './types.js';

const app = new Hono<AppEnv>();

// Restrict CORS to the participant app origin (per-environment via wrangler vars).
app.use('*', (c, next) =>
  cors({ origin: c.env.USER_APP_ORIGIN, allowMethods: ['GET', 'POST', 'OPTIONS'] })(c, next),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/api/sessions', sessionsRouter);

app.onError((err, c) => {
  console.error('Unhandled API error', err);
  return c.json(errorBody('INTERNAL', 'An unexpected error occurred.'), 500);
});

export default app;
export { SessionRoom } from './durable-objects/session-room.js';
