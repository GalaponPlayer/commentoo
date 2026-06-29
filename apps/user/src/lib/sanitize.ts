/**
 * XSS stance: comment and nickname text is ALWAYS rendered as React text children
 * (auto-escaped) -- never via dangerouslySetInnerHTML, and no URL auto-linking in
 * Phase 1. The server is the authority on validation; this is light client-side
 * normalization before sending (the server re-validates lengths and content).
 */

// C0/C1 control-character ranges to strip, keeping tab (9) and newline (10).
const CONTROL_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 8],
  [11, 12],
  [14, 31],
  [127, 127],
];

function isControlChar(code: number): boolean {
  return CONTROL_RANGES.some(([lo, hi]) => code >= lo && code <= hi);
}

/** Remove control characters and trim surrounding whitespace. */
export function normalizeText(input: string): string {
  let out = '';
  for (const ch of input) {
    if (!isControlChar(ch.codePointAt(0) ?? 0)) out += ch;
  }
  return out.trim();
}
