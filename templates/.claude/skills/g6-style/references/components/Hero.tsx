'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { Fragment, type CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import { defineMessages } from '@/lib/i18n';
import { useLocale, useMessages } from '@/lib/LocaleProvider';
import { HeroVisual } from './HeroVisual';
import { ctaProps } from '@/lib/analytics';
import { HERO_CTA, SECONDARY_CTA, SETUP_HREF } from './landing';
import { Phrases } from './LandingSection';
import { landingMessages } from './messages';
import { PlayGlyph } from './PlayGlyph';
import { VideoDialogButton } from './VideoDialog';
import { VISUALS } from './visuals';

/** The headline: the parts of the first line, then the parts of the gold second line (see `Parts`). */
type Title = [first: string[], second: string[]];

/** Homepage v4, §2: headline A, the digital business card first. */
const messages = defineMessages({
  ja: {
    title: [['あなたの', 'デジタル名刺、'], ['Hokidon。']] satisfies Title,
    lead: '自己紹介や連絡先を、ひとつのデジタル名刺に。仕事、SNS、日々の活動を紹介する、自分のページとしても使えます。',
    how: '使い方を見る',
    watch: (seconds: number) => `動画で紹介を見る（${seconds}秒）`,
    note: 'カード購入不要。公開プロフィールを見る相手は、アプリも登録も不要です。',
  },
  en: {
    title: [['Your digital', 'business card,'], ['on Hokidon.']] satisfies Title,
    lead: 'Bring your bio and contact details together in one digital business card. Use it as a personal page to share your work, social links and updates, too.',
    how: 'See how it works',
    watch: (seconds: number) => `Watch the intro (${seconds}s)`,
    note: 'No card purchase needed. Viewers need no app or account to open your public profile.',
  },
  vi: {
    title: [['Danh thiếp số', 'của bạn,'], ['trên Hokidon.']] satisfies Title,
    lead: 'Gom lời giới thiệu và liên hệ vào một danh thiếp số. Bạn cũng có thể dùng như trang chia sẻ cá nhân để giới thiệu công việc, mạng xã hội và những cập nhật của mình.',
    how: 'Xem cách sử dụng',
    watch: (seconds: number) => `Xem video giới thiệu (${seconds} giây)`,
    note: 'Không cần mua thẻ. Người xem hồ sơ công khai không cần ứng dụng hay tài khoản.',
  },
});

/**
 * Text that wraps only between its parts (「伝えきれない / あなたを。」, not 「あなた / を。」): each part is an
 * inline-block with `className`, so the gradient headline keeps its gold per part. Japanese runs the parts
 * together; other languages put a space between them.
 */
function Parts({ parts, className }: { parts: readonly string[]; className?: string }) {
  const { locale } = useLocale();
  return parts.map((part, i) => (
    <Fragment key={part}>
      {i > 0 && locale !== 'ja' ? ' ' : null}
      <span className={clsx('inline-block', className)}>{part}</span>
    </Fragment>
  ));
}

/** Entrance order of the hero's text: each part rises a little after the one above it (CSS, first paint). */
const rise = (step: number): { style: CSSProperties } => ({ style: { animationDelay: `${0.08 + step * 0.09}s` } });

/**
 * First view (homepage v4 §2): the digital business card first, the personal page in the
 * lead; the CTA stays the free profile, the second button plays the intro video (owner, 2026-10-21). The text rises
 * in on first paint with CSS (never waits for JavaScript); the second headline line drifts through the brand
 * gradient.
 */
export function Hero({ host }: { host: string }) {
  const { locale } = useLocale();
  const t = useMessages(messages);
  const common = useMessages(landingMessages);
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* Skylight: warm light falling from the top, the way an atrium's lit ceiling washes the floor below. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70%] bg-(image:--c-skylight)"
      />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 pt-10 pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:pt-14 lg:pb-16">
        <div>
          <h1 id="hero-title" className="text-[34px] leading-[1.22] font-extrabold tracking-tight text-ink-title sm:text-5xl sm:leading-[1.16] lg:text-[3.6rem]">
            <span {...rise(0)} className="animate-rise block">
              <Parts parts={t.title[0]} />
            </span>
            {/* Japanese runs the two lines together; a space between them elsewhere (the h1's text for readers). */}
            {locale === 'ja' ? null : ' '}
            <span {...rise(1)} className="animate-rise block">
              <Parts parts={t.title[1]} className="bg-flare-ink text-gradient animate-flow bg-[length:200%_200%]" />
            </span>
          </h1>
          <p {...rise(2)} className="animate-rise mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
            <Phrases text={t.lead} />
          </p>
          <div {...rise(3)} className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={SETUP_HREF} className={HERO_CTA} {...ctaProps('hero', 'setup')}>
              {common.cta}
              <Icon name="arrow-right" tone="mono" size={20} />
            </Link>
            {/* Beside the CTA: the intro video (owner, 2026-10-21); until it exists, the link to the steps. */}
            {VISUALS.intro ? (
              <VideoDialogButton video={VISUALS.intro} className={`${SECONDARY_CTA} group`}>
                <PlayGlyph className="transition-transform duration-200 ease-glide group-hover:scale-110" />
                {t.watch(VISUALS.intro.seconds)}
              </VideoDialogButton>
            ) : (
              <a href="#how" className={SECONDARY_CTA}>
                {t.how}
                <Icon name="arrow-down" tone="mono" size={20} />
              </a>
            )}
          </div>
          <p {...rise(4)} className="animate-rise mt-6 flex max-w-lg items-start gap-1.5 text-sm font-bold text-ink-soft">
            <Icon name="circle-check" size={18} className="mt-0.5 shrink-0" />
            <span>
              <Phrases text={t.note} />
            </span>
          </p>
        </div>
        <HeroVisual host={host} />
      </div>
    </section>
  );
}
