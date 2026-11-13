import clsx from 'clsx';

/** Play mark for the video buttons (the icon set has none): a lime disc with a dark triangle, the same in both themes. */
export function PlayGlyph({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className={clsx('shrink-0', className)}>
      <circle cx="12" cy="12" r="12" fill="#f2c76e" />
      <path d="M9.6 7.6v8.8a.6.6 0 0 0 .92.5l6.8-4.4a.6.6 0 0 0 0-1l-6.8-4.4a.6.6 0 0 0-.92.5Z" fill="#0d0a06" />
    </svg>
  );
}
