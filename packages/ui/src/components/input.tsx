import * as React from 'react';

import { cn } from '../lib/utils.js';

// Text input — inherits theme tokens, so it reads correctly in both the
// dark participant app and the light admin automatically. Set `aria-invalid`
// to surface the destructive (error) state.
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-none border border-input bg-background px-3 text-base text-foreground',
        'placeholder:text-muted-foreground',
        'transition-[border-color,box-shadow] duration-100',
        'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/25',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
