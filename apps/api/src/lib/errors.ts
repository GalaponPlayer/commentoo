import type { ApiError, ApiErrorCode } from '@commentoo/shared';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Build the canonical error body: { error: { code, message } }. */
export function errorBody(code: ApiErrorCode, message: string): ApiError {
  return { error: { code, message } };
}

/** HTTP status for each error code. */
export const ERROR_STATUS: Record<ApiErrorCode, ContentfulStatusCode> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SESSION_NOT_LIVE: 409,
  CODE_COLLISION: 503,
  INTERNAL: 500,
};
