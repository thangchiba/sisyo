import clsx from 'clsx';
import Image from 'next/image';
import type { ReactNode } from 'react';
import type { Visual } from './visuals';
import type { Locale } from '@/lib/i18n';

/**
 * A phone around a real screen capture of Hokidon (captures are 900×1948: a 390 pt wide iPhone screen).
 * Width from `className`, height from the screen's ratio, so it scales with its column; the bezel
 * stays black in both themes. Not `ui/PhoneFrame`, which lays out a live 375 px page.
 */
export function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-[14%/6.5%] bg-[#15110b] p-[2.6%]',
        'shadow-[0_0_0_1px_rgb(255_255_255/.1),inset_0_0_0_1px_rgb(255_255_255/.06),0_28px_70px_rgb(16_24_40/.3)]',
        className,
      )}
    >
      <div data-theme="light" className="relative aspect-[900/1948] overflow-hidden rounded-[11.5%/5.4%] bg-white">
        {children}
      </div>
    </div>
  );
}

/** A screen capture filling a Phone. `priority` for the one that can be the page's largest paint. */
export function PhoneScreen({
  visual,
  locale,
  sizes,
  priority = false,
}: {
  visual: Visual;
  locale: Locale;
  sizes: string;
  priority?: boolean;
}) {
  return <Image src={visual.src} alt={visual.alt[locale]} fill priority={priority} sizes={sizes} className="object-cover object-top" />;
}
