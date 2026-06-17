import * as React from 'react';

import { cn } from '../lib/utils.js';

export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange'
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Track color when on. `ai` turns Companion teal (AI settings); default is Spotlight ink. */
  tone?: 'primary' | 'ai';
}

// Toggle switch — used heavily in admin AI-companion settings. A native
// `role="switch"` button (keyboard-operable, no extra dependency).
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, tone = 'primary', disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-[26px] w-11 shrink-0 items-center rounded-full outline-none',
        'transition-colors duration-100 ease-out',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? (tone === 'ai' ? 'bg-ai' : 'bg-primary') : 'bg-secondary',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none absolute left-[3px] size-5 rounded-full bg-white shadow-sm',
          'transition-transform duration-100 ease-out',
          checked ? 'translate-x-[18px]' : 'translate-x-0',
        )}
      />
    </button>
  ),
);
Switch.displayName = 'Switch';

export { Switch };
