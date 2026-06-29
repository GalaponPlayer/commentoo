import type { JoinResponse } from '@commentoo/shared';

/**
 * Persist the participant token in sessionStorage keyed by join code, so a page
 * reload reuses the same identity (and the feed re-syncs history via REST) without
 * forcing a re-join. Tokens are short-lived; we refresh when near expiry.
 */
const EXPIRY_SKEW_MS = 60_000;

function key(code: string): string {
  return `commentoo:token:${code}`;
}

export function loadToken(code: string): JoinResponse | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(key(code));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as JoinResponse;
    if (Date.parse(value.expiresAt) - EXPIRY_SKEW_MS <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveToken(code: string, value: JoinResponse): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(key(code), JSON.stringify(value));
}
