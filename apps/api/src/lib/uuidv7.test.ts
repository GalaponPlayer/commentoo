import { describe, expect, it } from 'vitest';
import { createUuidv7 } from './uuidv7.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createUuidv7', () => {
  it('produces well-formed v7 uuids (version 7, variant 10xx)', () => {
    const gen = createUuidv7();
    for (let i = 0; i < 50; i += 1) {
      expect(gen()).toMatch(UUID_RE);
    }
  });

  it('encodes the timestamp in the leading bits', () => {
    const ms = 0x0190abcdef12;
    const gen = createUuidv7({ now: () => ms, randomRegion: () => 0n });
    expect(gen().startsWith('0190abcd-ef12')).toBe(true);
  });

  it('is strictly monotonic within the same millisecond', () => {
    const gen = createUuidv7({ now: () => 1000, randomRegion: () => 0n });
    const ids = Array.from({ length: 100 }, () => gen());
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });

  it('stays monotonic across a backwards clock', () => {
    let t = 5000;
    const gen = createUuidv7({ now: () => t, randomRegion: () => 0n });
    const a = gen();
    t = 4000; // clock jumps back
    const b = gen();
    expect(b > a).toBe(true);
  });

  it('rolls over to the next ms when the random region is exhausted', () => {
    const gen = createUuidv7({ now: () => 1000, randomRegion: () => (1n << 74n) - 1n });
    const a = gen(); // rand at max
    const b = gen(); // must borrow next ms
    expect(b > a).toBe(true);
  });
});
