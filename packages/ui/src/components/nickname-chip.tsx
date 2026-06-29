import * as React from 'react';

import { cn } from '../lib/utils.js';

export interface NicknameChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
}

/**
 * Pseudo-anonymous participant identity label. A small identity dot (a genuine
 * circle, so radius-pill applies) plus the nickname in muted ink — reads as a
 * label, never a tappable control.
 */
function NicknameChip({ name, className, ...props }: NicknameChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground',
        className,
      )}
      {...props}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground" />
      {name}
    </span>
  );
}

export { NicknameChip };
