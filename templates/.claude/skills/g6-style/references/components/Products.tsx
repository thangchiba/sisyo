'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { findProduct, type Product } from '@pro5/shared/billing';
import { yen } from '@pro5/shared/config';
import { Icon } from '@/components/ui/Icon/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { cardSubscriptionMonths, subscriptionPeriod } from '@/lib/catalog';
import { defineMessages } from '@/lib/i18n';
import { useLocale, useMessages } from '@/lib/LocaleProvider';
import { PLANS_HREF, SECONDARY_CTA } from './landing';
import { LandingSection, Phrases } from './LandingSection';
import { VISUALS, type Visual } from './visuals';

type Item = { name: string; description: string };

/**
 * Hokidon's products (homepage v4 §8; owner 2026-10-21: a row that scrolls sideways and grows, with
 * prices like the earlier plan cards). Today the two NFC cards; an NFC tag or a QR sticker is one more entry in
 * `ITEMS` and in `messages`. Extra profiles are a product too, but not on the homepage.
 */
const messages = defineMessages({
  ja: {
    title: 'Hokidonのアイテム',
    lead: 'あなたのデジタル名刺を、もっと渡しやすく。使う場面に合うアイテムを選べます。',
    items: {
      standard: { name: 'スタンダード NFCカード', description: '白のNFCカード。毎日の名刺交換に。' },
      premium: { name: 'プレミアム NFCカード', description: '黒に金の箔押しを施したNFCカード。対面でのご挨拶に。' },
    },
    tax: (freeShipping: boolean) => `（税込${freeShipping ? '・送料無料' : ''}）`,
    points: (period: string | null) => [
      ...(period ? [`サブスクリプション${period}分つき`] : []),
      'スマホにかざすだけでプロフィールが開く',
      '受け取る側はアプリ不要',
    ],
    cta: '詳しく見る',
    prev: '前のアイテム',
    next: '次のアイテム',
    note: 'カードを購入しなくても、Hokidonは無料で使えます。',
  },
  en: {
    title: 'Hokidon products',
    lead: 'Find a way to share your digital business card that fits your day.',
    items: {
      standard: { name: 'Standard NFC card', description: 'A white NFC card for everyday introductions.' },
      premium: { name: 'Premium NFC card', description: 'A black NFC card with gold foil detail, for in-person introductions.' },
    },
    tax: (freeShipping: boolean) => `(tax incl.${freeShipping ? ', free shipping' : ''})`,
    points: (period: string | null) => [
      ...(period ? [`Includes ${period} of subscription`] : []),
      'Hold it to a phone and your profile opens',
      'No app needed on their side',
    ],
    cta: 'View details',
    prev: 'Previous item',
    next: 'Next item',
    note: 'You can use Hokidon for free without buying a card.',
  },
  vi: {
    title: 'Sản phẩm Hokidon',
    lead: 'Chọn sản phẩm phù hợp để chia sẻ danh thiếp số thuận tiện hơn.',
    items: {
      standard: { name: 'Thẻ NFC Standard', description: 'Thẻ NFC màu trắng cho việc trao danh thiếp hằng ngày.' },
      premium: { name: 'Thẻ NFC Premium', description: 'Thẻ NFC đen dập ánh kim, dành cho những lần gặp trực tiếp.' },
    },
    tax: (freeShipping: boolean) => `(đã gồm thuế${freeShipping ? ', miễn phí vận chuyển' : ''})`,
    points: (period: string | null) => [
      ...(period ? [`Kèm ${period} Subscription`] : []),
      'Chạm vào điện thoại là hồ sơ mở ra',
      'Người nhận không cần ứng dụng',
    ],
    cta: 'Xem chi tiết',
    prev: 'Sản phẩm trước',
    next: 'Sản phẩm tiếp theo',
    note: 'Không cần mua thẻ để dùng Hokidon miễn phí.',
  },
});

type ItemKey = keyof (typeof messages)['ja']['items'];

/** The products in display order: the catalogue id (price, free months), the copy key, the picture. */
const ITEMS: { id: string; key: ItemKey; visual: Visual; tilt: string; size: [number, number] }[] = [
  { id: 'card', key: 'standard', visual: VISUALS.cards.standard, tilt: 'rotate-[3deg]', size: [720, 409] },
  { id: 'card_premium', key: 'premium', visual: VISUALS.cards.premium, tilt: '-rotate-[3deg]', size: [720, 425] },
];

/** A catalogue entry the landing page prices; a missing id fails the build instead of showing a wrong price. */
function product(id: string): Product {
  const found = findProduct(id);
  if (!found) throw new Error(`Unknown product ${id}`);
  return found;
}

function ProductCard({ item }: { item: (typeof ITEMS)[number] }) {
  const { locale } = useLocale();
  const t = useMessages(messages);
  const p = product(item.id);
  const months = cardSubscriptionMonths(item.id);
  const copy: Item = t.items[item.key];
  return (
    <div className="neon-card neon-glow tone-lime group flex h-full flex-col overflow-hidden p-5 transition-[transform,box-shadow] duration-300 ease-glide hover:-translate-y-1 hover:shadow-float sm:p-6">
      <div className="relative -mx-5 -mt-5 flex h-48 items-center justify-center bg-[radial-gradient(80%_70%_at_50%_40%,rgb(242_199_110/.22),transparent_70%)] sm:-mx-6 sm:-mt-6">
        <Image
          src={item.visual.src}
          alt={item.visual.alt[locale]}
          width={item.size[0]}
          height={item.size[1]}
          sizes="260px"
          className={clsx('w-[72%] drop-shadow-xl transition-transform duration-500 ease-glide group-hover:scale-[1.04]', item.tilt)}
        />
      </div>
      <h3 className="mt-5 text-lg font-bold text-ink-title">{copy.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        <Phrases text={copy.description} />
      </p>
      <p className="mt-4 text-ink-title">
        <span className="font-display text-4xl font-bold tracking-tight tabular-nums">{yen(p.priceJpy)}</span>
        <span className="ml-1.5 text-sm text-muted">{t.tax(p.shippingJpy === 0)}</span>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-ink-body">
        {t.points(months > 0 ? subscriptionPeriod(months, locale) : null).map((point) => (
          <li key={point} className="flex gap-2">
            <Icon name="circle-check" tone="lime" size={18} className="mt-0.5 shrink-0" />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <Link href={PLANS_HREF} className={`${SECONDARY_CTA} w-full`} aria-label={`${copy.name}: ${t.cta}`}>
          {t.cta}
        </Link>
      </div>
    </div>
  );
}

/**
 * The row of products: it scrolls sideways (snap) once there are more than fit; the arrows show only then.
 * `data-scroll-x`: wider than the screen on purpose (check:mobile skips it).
 */
export function Products() {
  const t = useMessages(messages);
  const row = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * 340, behavior: 'smooth' });
  const arrow = 'grid size-11 place-items-center rounded-full bg-surface text-ink-title shadow-edge ring-1 ring-line transition-opacity duration-200 hover:ring-neon-lime/70 disabled:opacity-30';
  const scrolls = !(edges.start && edges.end);

  return (
    <LandingSection id="products" band eyebrow="Products" title={t.title} lead={t.lead}>
      <div className="relative mt-10">
        <ul
          ref={row}
          data-scroll-x
          className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pt-2 pb-4 [scrollbar-width:thin] sm:mx-auto sm:w-fit sm:max-w-full sm:px-1"
        >
          {ITEMS.map((item, index) => (
            <li key={item.id} className="w-[82%] max-w-[340px] shrink-0 snap-start sm:w-[340px]">
              <Reveal delay={index * 0.08} className="h-full">
                <ProductCard item={item} />
              </Reveal>
            </li>
          ))}
        </ul>
        {scrolls ? (
          <div className="mt-2 hidden justify-center gap-3 sm:flex">
            <button type="button" className={arrow} onClick={() => scrollBy(-1)} disabled={edges.start} aria-label={t.prev}>
              <Icon name="chevron-left" tone="mono" size={20} />
            </button>
            <button type="button" className={arrow} onClick={() => scrollBy(1)} disabled={edges.end} aria-label={t.next}>
              <Icon name="chevron-right" tone="mono" size={20} />
            </button>
          </div>
        ) : null}
      </div>
      <p className="mt-6 text-center text-sm font-bold text-ink-soft">
        <Phrases text={t.note} />
      </p>
    </LandingSection>
  );
}
