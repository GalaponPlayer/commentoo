'use client';

import { useState } from 'react';
import {
  COMMENT_CONTENT_MAX,
  COMMENT_NICKNAME_MAX,
  type CreateCommentInput,
} from '@commentoo/shared';
import { Button, Input } from '@commentoo/ui';
import { normalizeText } from '../lib/sanitize';
import { generateNickname } from '../lib/nickname';

export interface CommentFormProps {
  defaultNickname: string;
  onPost: (input: CreateCommentInput) => boolean;
  disabled?: boolean;
}

/** Nickname (editable, prefilled, never required) + content input. */
export function CommentForm({ defaultNickname, onPost, disabled = false }: CommentFormProps) {
  const [nickname, setNickname] = useState(defaultNickname);
  const [content, setContent] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = normalizeText(content).slice(0, COMMENT_CONTENT_MAX);
    if (!text) return;
    // Nickname is optional; fall back to a fresh generated one if cleared.
    const name = normalizeText(nickname).slice(0, COMMENT_NICKNAME_MAX) || generateNickname();
    if (onPost({ nickname: name, content: text })) setContent('');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-border p-3">
      <Input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="ニックネーム"
        maxLength={COMMENT_NICKNAME_MAX}
        aria-label="ニックネーム"
        className="h-8 max-w-[12rem] text-sm"
      />
      <div className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="コメントを入力"
          maxLength={COMMENT_CONTENT_MAX}
          aria-label="コメント"
          className="flex-1"
          disabled={disabled}
        />
        <Button type="submit" disabled={disabled || normalizeText(content).length === 0}>
          送信
        </Button>
      </div>
    </form>
  );
}
