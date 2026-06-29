import { describe, expect, it } from 'vitest';
import { NICKNAME_ADJECTIVES, NICKNAME_ANIMALS, generateNickname } from './nickname';

describe('generateNickname', () => {
  it('combines an adjective and an animal from the lists', () => {
    const name = generateNickname(() => 0);
    expect(name).toBe(`${NICKNAME_ADJECTIVES[0]}${NICKNAME_ANIMALS[0]}`);
  });

  it('always returns a non-empty string composed of known parts', () => {
    for (let i = 0; i < 100; i += 1) {
      const name = generateNickname();
      const adj = NICKNAME_ADJECTIVES.find((a) => name.startsWith(a));
      expect(adj).toBeDefined();
      expect(name.slice(adj!.length)).toMatch(new RegExp(`^(${NICKNAME_ANIMALS.join('|')})$`));
    }
  });

  it('selects the last element when rng approaches 1', () => {
    const name = generateNickname(() => 0.999999);
    expect(name).toBe(
      `${NICKNAME_ADJECTIVES[NICKNAME_ADJECTIVES.length - 1]}${NICKNAME_ANIMALS[NICKNAME_ANIMALS.length - 1]}`,
    );
  });
});
