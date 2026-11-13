import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Reveal } from '@/components/ui/Reveal';

/**
 * Japanese text that wraps only after 、 or 。: each phrase is an inline-block, so a heading breaks
 * between phrases instead of leaving one character on the next line (「プロフィー / ル。」). A phrase
 * wider than the line still wraps inside itself.
 */
export function Phrases({ text }: { text: string }) {
  return (
    <>
      {text.split(/(?<=[、。])/).map((phrase, i) => (
        <span key={i} className="inline-block">
          {phrase}
        </span>
      ))}
    </>
  );
}

/** Eyebrow + h2 + lead of a landing section; `id` names the heading (`<id>-title`) for aria-labelledby. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  align = 'left',
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
}) {
  return (
    <Reveal className={clsx('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p
        className={clsx(
          'flex items-center gap-3 font-display text-xs font-semibold tracking-[.22em] text-neon-ink-lime uppercase',
          align === 'center' && 'justify-center',
        )}
      >
        <span aria-hidden="true" className="led-line w-8" />
        {eyebrow}
        {align === 'center' ? <span aria-hidden="true" className="led-line w-8" /> : null}
      </p>
      <h2 id={`${id}-title`} className="mt-2 text-2xl leading-snug font-bold text-ink-title sm:text-3xl lg:text-4xl lg:leading-tight">
        <Phrases text={title} />
      </h2>
      {lead ? (
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          <Phrases text={lead} />
        </p>
      ) : null}
    </Reveal>
  );
}

/**
 * One landing section: full width, so `band` can lay a light strip behind it to set it apart from its
 * neighbours; the content keeps the page width (max-w-6xl).
 */
export function LandingSection({
  id,
  eyebrow,
  title,
  lead,
  align = 'center',
  band = false,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
  band?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={clsx('relative overflow-x-clip py-16 md:py-24', band && 'bg-surface/55')}>
      {band ? <span aria-hidden="true" className="led-line absolute inset-x-0 top-0" /> : null}
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading id={id} eyebrow={eyebrow} title={title} lead={lead} align={align} />
        {children}
      </div>
    </section>
  );
}
