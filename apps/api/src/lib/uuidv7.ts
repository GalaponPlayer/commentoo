/**
 * Monotonic UUIDv7 generator (RFC 9562).
 *
 * Layout (128 bits): 48-bit unix-ms | version(0x7) | 12-bit rand_a |
 * variant(0b10) | 62-bit rand_b. rand_a+rand_b form a 74-bit random region.
 *
 * Monotonicity matters: the SessionRoom DO assigns ids in broadcast order and the
 * client dedups/paginates by "id > cursor". Within the same millisecond we increment
 * the random region instead of re-randomizing, so ids are strictly increasing in
 * assignment order — broadcast order == lexicographic id order == DB sort order.
 */
const RAND_BITS = 74n;
const RAND_MAX = (1n << RAND_BITS) - 1n;
const RAND_A_MASK = 0xfffn; // 12 bits
const RAND_B_MASK = (1n << 62n) - 1n; // 62 bits

export interface Uuidv7Options {
  now?: () => number;
  /** Returns a fresh 74-bit random value. Injectable for deterministic tests. */
  randomRegion?: () => bigint;
}

function defaultRandomRegion(): bigint {
  const bytes = new Uint8Array(10); // 80 bits, masked down to 74
  crypto.getRandomValues(bytes);
  let value = 0n;
  for (const b of bytes) value = (value << 8n) | BigInt(b);
  return value & RAND_MAX;
}

function format(ms: number, rand: bigint): string {
  const randA = (rand >> 62n) & RAND_A_MASK;
  const randB = rand & RAND_B_MASK;
  let v = 0n;
  v |= BigInt(ms) << 80n;
  v |= 0x7n << 76n; // version
  v |= randA << 64n;
  v |= 0x2n << 62n; // variant 0b10
  v |= randB;
  const hex = v.toString(16).padStart(32, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Create a stateful, monotonic UUIDv7 generator. */
export function createUuidv7(options: Uuidv7Options = {}): () => string {
  const now = options.now ?? Date.now;
  const randomRegion = options.randomRegion ?? defaultRandomRegion;
  let lastMs = 0;
  let lastRand = 0n;

  return function uuidv7(): string {
    let ms = now();
    if (ms > lastMs) {
      lastMs = ms;
      lastRand = randomRegion();
    } else {
      // Same ms (or clock went backwards): keep time, advance the random region.
      ms = lastMs;
      lastRand += 1n;
      if (lastRand > RAND_MAX) {
        // Random region exhausted within a ms — borrow from the next ms.
        lastMs += 1;
        ms = lastMs;
        lastRand = randomRegion();
      }
    }
    return format(ms, lastRand);
  };
}

/** Process-wide default generator. */
export const uuidv7 = createUuidv7();
