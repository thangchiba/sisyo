import clsx from 'clsx';
import type { ReactNode } from 'react';

/**
 * An on / off setting with its label and a line of explanation (role="switch", so a screen reader says
 * on / off). The track is the gold key when on, a neutral groove when off; the knob slides between them.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
  testId,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <label className={clsx('flex items-start justify-between gap-4', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', className)}>
      <span className="min-w-0">
        <span className="block font-bold text-ink-title">{label}</span>
        {description ? <span className="mt-1 block text-xs leading-relaxed text-muted">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        data-testid={testId}
        className={clsx(
          'relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-[background-color,box-shadow] duration-200 ease-glide',
          checked ? 'bg-cta shadow-glow-sm' : 'bg-surface-3 ring-1 ring-line-strong ring-inset',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'absolute top-1 left-1 size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/.25)] transition-transform duration-200 ease-pop',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </label>
  );
}
