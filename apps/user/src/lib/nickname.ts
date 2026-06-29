/**
 * Auto-generated Japanese nicknames in the "青いペンギン" (adjective + animal) style.
 * Pseudo-anonymity keeps comments flowing — the nickname is prefilled and editable
 * but never required (target: QR scan to first comment in < 5s).
 */

export const NICKNAME_ADJECTIVES = [
  '青い',
  '赤い',
  '黄色い',
  '緑の',
  '金色の',
  '銀色の',
  '静かな',
  '元気な',
  '陽気な',
  '勇敢な',
  '優しい',
  '賢い',
  'のんびり',
  'きらきら',
  'ふわふわ',
] as const;

export const NICKNAME_ANIMALS = [
  'ペンギン',
  'キリン',
  'タヌキ',
  'イルカ',
  'フクロウ',
  'カワウソ',
  'ハリネズミ',
  'コアラ',
  'パンダ',
  'ラッコ',
  'アルパカ',
  'ハムスター',
  'クジラ',
  'キツネ',
  'ネコ',
] as const;

function pick<T>(list: readonly T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)]!;
}

/** Generate a nickname. `rng` is injectable for deterministic tests. */
export function generateNickname(rng: () => number = Math.random): string {
  return `${pick(NICKNAME_ADJECTIVES, rng)}${pick(NICKNAME_ANIMALS, rng)}`;
}
