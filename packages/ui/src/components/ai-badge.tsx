import * as React from 'react';

import { cn } from '../lib/utils.js';

export type AIBadgeProps = React.HTMLAttributes<HTMLSpanElement>;

/**
 * Marks AI-authored content. The AI is a distinct character (Design Principle 4):
 * the 🤖 glyph + the reserved `--ai` teal make it identifiable at a glance and
 * never mistaken for a human. The robot is one of the few sanctioned emoji.
 */
function AIBadge({ className, ...props }: AIBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1 rounded-none bg-ai-subtle px-2 text-xs font-bold leading-none text-ai-subtle-foreground',
        className,
      )}
      {...props}
    >
      <span aria-hidden>🤖</span>
      AI
    </span>
  );
}

export { AIBadge };
