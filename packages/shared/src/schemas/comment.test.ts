import { describe, expect, it } from 'vitest';
import { createCommentInputSchema, commentSchema } from './comment.js';

describe('createCommentInputSchema', () => {
  it('accepts a valid comment and trims whitespace', () => {
    const parsed = createCommentInputSchema.parse({
      nickname: '  青いペンギン  ',
      content: '  こんにちは  ',
    });
    expect(parsed.nickname).toBe('青いペンギン');
    expect(parsed.content).toBe('こんにちは');
    expect(parsed.parentId).toBeUndefined();
  });

  it('rejects empty content (after trim)', () => {
    expect(() => createCommentInputSchema.parse({ nickname: 'a', content: '   ' })).toThrow();
  });

  it('rejects empty nickname (after trim)', () => {
    expect(() => createCommentInputSchema.parse({ nickname: '   ', content: 'hi' })).toThrow();
  });

  it('rejects content over the max length', () => {
    expect(() =>
      createCommentInputSchema.parse({ nickname: 'a', content: 'x'.repeat(501) }),
    ).toThrow();
  });

  it('rejects a non-uuid parentId', () => {
    expect(() =>
      createCommentInputSchema.parse({ nickname: 'a', content: 'hi', parentId: 'not-a-uuid' }),
    ).toThrow();
  });
});

describe('commentSchema', () => {
  it('validates a full canonical comment', () => {
    const comment = {
      id: '00000000-0000-7000-8000-000000000000',
      sessionId: '11111111-1111-4111-8111-111111111111',
      nickname: '青いペンギン',
      content: 'hi',
      type: 'user' as const,
      parentId: null,
      createdAt: '2026-06-17T00:00:00.000Z',
    };
    expect(commentSchema.parse(comment)).toEqual(comment);
  });
});
