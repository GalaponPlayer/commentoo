'use client';

import { useEffect, useRef } from 'react';
import type { Comment } from '@commentoo/shared';
import { CommentItem } from '@commentoo/ui';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

/** Auto-scrolling live feed. Sticks to the bottom unless the user has scrolled up. */
export function CommentList({ comments }: { comments: Comment[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [comments]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 divide-y divide-border overflow-y-auto"
    >
      {comments.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          まだコメントはありません。最初のひとことをどうぞ。
        </p>
      ) : (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            nickname={comment.nickname}
            content={comment.content}
            isAI={comment.type === 'ai'}
            timestamp={formatTime(comment.createdAt)}
          />
        ))
      )}
    </div>
  );
}
