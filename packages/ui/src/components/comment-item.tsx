import * as React from 'react';

import { cn } from '../lib/utils.js';
import { AIBadge } from './ai-badge.js';
import { NicknameChip } from './nickname-chip.js';

export interface CommentItemProps extends React.HTMLAttributes<HTMLDivElement> {
  nickname: string;
  content: string;
  /** AI comments get the reserved teal accent + 🤖 badge. */
  isAI?: boolean;
  /** Pre-formatted time string (formatting/locale handled by the caller). */
  timestamp?: string;
}

/**
 * A single comment row in the live feed. Flat, sharp-cornered; AI comments are
 * distinguished by a left `--ai` rule plus the AI badge (never recoloured human
 * comments). Content is rendered as text only — React escapes it (XSS-safe).
 */
const CommentItem = React.forwardRef<HTMLDivElement, CommentItemProps>(
  ({ nickname, content, isAI = false, timestamp, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1 px-4 py-3', isAI && 'border-l-2 border-ai', className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        {isAI ? <AIBadge /> : <NicknameChip name={nickname} />}
        {timestamp ? (
          <time className="text-xs tabular-nums text-muted-foreground">{timestamp}</time>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap break-words text-base leading-snug text-foreground">
        {content}
      </p>
    </div>
  ),
);
CommentItem.displayName = 'CommentItem';

export { CommentItem };
