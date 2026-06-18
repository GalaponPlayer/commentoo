import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils.js';

const badgeVariants = cva(
  'inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-none px-2.5 text-xs font-bold leading-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border text-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        success: 'bg-success text-success-foreground',
        // Companion — AI comments / AI badge only.
        ai: 'bg-ai text-ai-foreground',
        // Cheer — reactions, LIVE, surge.
        cheer: 'bg-cheer text-cheer-foreground',
      },
      // Sharp by default; pill only for genuinely circular contexts.
      pill: {
        true: 'rounded-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      pill: false,
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, pill, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, pill, className }))} {...props} />;
}

export { Badge, badgeVariants };
