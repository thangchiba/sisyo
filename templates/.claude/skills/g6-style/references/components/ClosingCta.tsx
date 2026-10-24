'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { defineMessages } from '@/lib/i18n';
import { useLocale, useMessages } from '@/lib/LocaleProvider';
import { ctaProps } from '@/lib/analytics';
import { CTA, SETUP_HREF } from './landing';
import { Phrases } from './LandingSection';
import { VISUALS } from './visuals';

/** Homepage v4 §10. */
const messages = defineMessages({
  ja: { title: ['次の出会いに、', 'あなたのデジタル名刺を。'], lead: 'まずは無料で。あなたを紹介する一枚を、Hokidonで作りましょう。', cta: '無料ではじめる', note: '写真はイメージです' },
  en: {
    title: ['Your digital business card', 'for your next introduction.'],
    lead: 'Start free. Create a digital business card that introduces you.',
    cta: 'Start free',
    note: 'Photo for illustration',
  },
  vi: {
    title: ['Danh thiếp số', 'cho lần gặp tiếp theo.'],
    lead: 'Bắt đầu miễn phí. Tạo danh thiếp số giới thiệu chính bạn trên Hokidon.',
    cta: 'Bắt đầu miễn phí',
    note: 'Ảnh minh họa',
  },
});

/**
 * Last section of the landing page (homepage v4 §10): your digital business card for the next meeting and
 * one more free-profile CTA, on the gold-lit atrium photo (dark in both themes, so its text is always white; the
 * CTA keeps the gold key).
 */
export function ClosingCta() {
  const { locale } = useLocale();
  const t = useMessages(messages);
  const photo = VISUALS.photos.atrium;
  return (
    <section aria-labelledby="closing-title" className="px-4 py-16 md:py-24">
      <Reveal className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#0d0a06] px-6 py-16 text-center shadow-float ring-1 ring-white/10 sm:px-12 sm:py-20">
        <Image src={photo.src} alt={photo.alt[locale]} fill sizes="(min-width: 1024px) 1024px, 100vw" className="-z-20 scale-105 object-cover object-[50%_45%] opacity-80" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(90%_80%_at_50%_100%,rgb(5_6_10/.92),rgb(5_6_10/.55)_60%,rgb(5_6_10/.35))]" />
        <div aria-hidden="true" className="animate-aurora absolute -bottom-1/2 left-1/2 -z-10 size-[80%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(242_199_110/.22),transparent)]" />
        <p className="font-display text-xs font-semibold tracking-[.18em] text-[#ecd6a6] uppercase">Get started</p>
        <h2 id="closing-title" className="mt-3 text-2xl leading-snug font-extrabold text-white min-[400px]:text-3xl sm:text-4xl lg:text-5xl lg:leading-tight">
          <span className="inline-block">{t.title[0]}</span>
          {/* Japanese runs the two phrases together; a space between the blocks elsewhere. */}
          {locale === 'ja' ? null : ' '}
          <span className="bg-flare animate-flow text-gradient inline-block bg-[length:200%_200%]">{t.title[1]}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/80 sm:text-lg">
          <Phrases text={t.lead} />
        </p>
        <Link href={SETUP_HREF} className={`${CTA} mt-8`} {...ctaProps('closing', 'setup')}>
          {t.cta}
          <Icon name="arrow-right" tone="mono" size={20} />
        </Link>
        <p className="absolute right-4 bottom-3 text-2xs text-white/50">※ {t.note}</p>
      </Reveal>
    </section>
  );
}
