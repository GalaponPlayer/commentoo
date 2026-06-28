import type { ParticipantTokenClaims } from '@commentoo/shared';

/** Worker bindings (wrangler.toml [vars] + secrets + durable_objects). */
export interface Env {
  SESSION_ROOM: DurableObjectNamespace;
  /** Secrets (.dev.vars locally, `wrangler secret put` in prod). */
  DATABASE_URL: string;
  PARTICIPANT_TOKEN_SECRET: string;
  /** Vars. */
  USER_APP_ORIGIN: string;
  PARTICIPANT_TOKEN_TTL_SECONDS: string;
  COMMENT_RATE_LIMIT_SECONDS: string;
  COMMENT_FLUSH_DELAY_MS: string;
}

/** Hono generic env: bindings + per-request variables. */
export interface AppEnv {
  Bindings: Env;
  Variables: {
    participant: ParticipantTokenClaims;
  };
}
