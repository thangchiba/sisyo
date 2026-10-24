'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { findProduct, type Product } from '@pro5/shared/billing';
import { yen } from '@pro5/shared/config';
import { FREE_PROFILES_PER_ACCOUNT, SUBSCRIPTION_PROFILES_PER_ACCOUNT } from '@pro5/shared/profile-limits';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { ctaProps, track } from '@/lib/analytics';
import { defineMessages } from '@/lib/i18n';
import { useMessages } from '@/lib/LocaleProvider';
import { CTA, PLANS_HREF, SETUP_HREF } from './landing';
import { LandingSection, Phrases } from './LandingSection';

/**
 * Free beside the subscription (homepage v4 §7; owner 2026-10-21: list what Free gives, and show the
 * plan's prices). Renewal is never part of the copy; extra profiles are not on the homepage.
 */
const messages = defineMessages({
  ja: {
    title: '無料でも、しっかり使える。',
    lead: '日々の名刺交換に必要な機能は、フリーでそろいます。もっと活用したくなったら、サブスクリプションへ。',
    perMonth: '月額',
    perYear: '年額',
    tax: '（税込）',
    free: {
      name: 'フリー',
      tagline: 'デジタル名刺を作って、すぐにシェア。',
      badge: 'まずはここから',
      benefits: (profiles: number) => [
        `プロフィール${profiles}件`,
        'URL・QRコードでシェア',
        '標準テーマ',
        '「連絡先に保存」ボタン',
        'Hokidonの連絡先（つながりを管理）',
        '情報はリアルタイムに更新',
      ],
      cta: '無料ではじめる',
    },
    subscription: {
      name: 'サブスクリプション',
      tagline: '見せ方も、出会ったあとの管理も、もっと自分らしく。',
      save: (months: number) => `${months}か月分お得`,
      benefits: (profiles: number) => [
        'フリーのすべての機能',
        'すべてのテーマ',
        'アクセス履歴',
        'Apple Wallet・Google ウォレット',
        '受け取った名刺の一覧・OCR読み取り',
        `最大${profiles}つのプロフィール`,
      ],
      annual: (months: number) => `年払いなら、月払い12か月分より${months}か月分お得。`,
      cta: 'プランを見る',
    },
  },
  en: {
    title: 'Free covers the essentials.',
    lead: 'Free has what everyday introductions need. When you want more, there is the subscription.',
    perMonth: 'Monthly',
    perYear: 'Yearly',
    tax: '(tax incl.)',
    free: {
      name: 'Free',
      tagline: 'Create your digital business card and share it right away.',
      badge: 'Start here',
      benefits: (profiles: number) => [
        `${profiles} ${profiles === 1 ? 'profile' : 'profiles'}`,
        'Share by URL and QR code',
        'Standard theme',
        '“Save contact” button',
        'Hokidon contacts (keep your connections)',
        'Your details update in real time',
      ],
      cta: 'Start free',
    },
    subscription: {
      name: 'Subscription',
      tagline: 'More ways to present yourself and keep track of the people you meet.',
      save: (months: number) => `Save ${months} months`,
      benefits: (profiles: number) => [
        'Everything in Free',
        'All themes',
        'Access history',
        'Apple Wallet and Google Wallet',
        'Received business cards list and OCR',
        `Up to ${profiles} profiles`,
      ],
      annual: (months: number) => `Pay yearly and save ${months} months compared with 12 monthly payments.`,
      cta: 'View plans',
    },
  },
  vi: {
    title: 'Miễn phí cũng đủ dùng.',
    lead: 'Gói Free đã có đủ tính năng cho việc trao danh thiếp hằng ngày. Khi muốn dùng nhiều hơn, hãy chọn Subscription.',
    perMonth: 'Theo tháng',
    perYear: 'Theo năm',
    tax: '(đã gồm thuế)',
    free: {
      name: 'Free',
      tagline: 'Tạo danh thiếp số và chia sẻ ngay.',
      badge: 'Bắt đầu từ đây',
      benefits: (profiles: number) => [
        `${profiles} hồ sơ`,
        'Chia sẻ bằng URL và mã QR',
        'Theme tiêu chuẩn',
        'Nút “Lưu vào danh bạ”',
        'Danh bạ Hokidon (quản lý kết nối)',
        'Thông tin cập nhật theo thời gian thực',
      ],
      cta: 'Bắt đầu miễn phí',
    },
    subscription: {
      name: 'Subscription',
      tagline: 'Thêm lựa chọn thể hiện bản thân và quản lý những người bạn gặp.',
      save: (months: number) => `Tiết kiệm ${months} tháng`,
      benefits: (profiles: number) => [
        'Mọi tính năng của Free',
        'Tất cả theme',
        'Lịch sử truy cập',
        'Apple Wallet và Google Wallet',
        'Danh sách danh thiếp nhận được và OCR',
        `Tối đa ${profiles} hồ sơ`,
      ],
      annual: (months: number) => `Trả theo năm, tiết kiệm ${months} tháng so với trả từng tháng trong 12 tháng.`,
      cta: 'Xem gói',
    },
  },
});

/** A catalogue entry the landing page prices; a missing id fails the build instead of showing a wrong price. */
function product(id: string): Product {
  const found = findProduct(id);
  if (!found) throw new Error(`Unknown product ${id}`);
  return found;
}

/** Set once 料金 has been on screen: `pricing_viewed` goes out once per visit (tab), not per landing render. */
let pricingSeen = false;

/** `pricing_viewed` once 料金 (#pricing) has scrolled well into view. */
function usePricingViewed() {
  useEffect(() => {
    const section = document.getElementById('pricing');
    if (pricingSeen || !section || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (pricingSeen || !entries.some((e) => e.isIntersecting)) return;
        pricingSeen = true;
        observer.disconnect();
        track('pricing_viewed');
      },
      // Its top inside the upper 60% of the screen: on a phone the section is far taller than the screen.
      { rootMargin: '0px 0px -40% 0px' },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
}

function Benefits({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={clsx('mt-6 space-y-2.5 text-sm', className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <Icon name="circle-check" tone="lime" size={18} className="mt-0.5 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Amount({ value, size = 'lg' }: { value: number; size?: 'lg' | 'md' }) {
  return <span className={clsx('font-display font-bold tracking-tight tabular-nums', size === 'lg' ? 'text-5xl' : 'text-4xl')}>{yen(value)}</span>;
}

function PlanName({ children, badge }: { children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-2xl font-bold">{children}</h3>
      {badge}
    </div>
  );
}

/**
 * Free (featured: it is enough to start) beside the subscription, a black and gold card in both themes. The
 * subscription's two prices and the months the yearly one saves come from the catalogue (`sub_monthly`,
 * `sub_yearly` in packages/shared/src/billing.ts), so the page follows the shop when the prices change.
 */
export function Pricing() {
  usePricingViewed();
  const t = useMessages(messages);
  const monthly = product('sub_monthly');
  const yearly = product('sub_yearly');
  const saved = Math.round(12 - yearly.priceJpy / monthly.priceJpy);

  return (
    <LandingSection id="pricing" eyebrow="Plans" title={t.title} lead={t.lead}>
      <div className="mx-auto mt-10 grid max-w-5xl items-stretch gap-5 md:grid-cols-2">
        <Reveal className="h-full">
          <div className="neon-card neon-glow tone-lime flex h-full flex-col border-neon-lime p-6 text-ink-title shadow-glow sm:p-8">
            <PlanName badge={<Badge tone="success">{t.free.badge}</Badge>}>{t.free.name}</PlanName>
            <p className="mt-1.5 text-sm text-muted">
              <Phrases text={t.free.tagline} />
            </p>
            <p className="mt-6 flex items-baseline gap-2">
              <Amount value={0} />
              <span className="text-sm text-muted">{t.perMonth}</span>
            </p>
            <Benefits items={t.free.benefits(FREE_PROFILES_PER_ACCOUNT)} className="text-ink-body" />
            <div className="mt-auto pt-8">
              <Link href={SETUP_HREF} className={`${CTA} w-full`} {...ctaProps('pricing', 'setup')}>
                {t.free.cta}
              </Link>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="h-full">
          <div className="neon-sweep h-full rounded-card">
            {/* Black and gold in both themes: the dark tokens apply inside. */}
            <div data-theme="dark" className="neon-card flex h-full flex-col bg-[linear-gradient(160deg,#1e1912,#0b0906)] p-6 text-ink-title sm:p-8">
              <PlanName>
                <span className="bg-flare text-gradient">{t.subscription.name}</span>
              </PlanName>
              <p className="mt-1.5 text-sm text-muted">
                <Phrases text={t.subscription.tagline} />
              </p>
              <dl className="mt-6 space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="w-16 shrink-0 text-sm font-bold text-ink-soft">{t.perMonth}</dt>
                  <dd>
                    <Amount value={monthly.priceJpy} size="md" />
                    <span className="ml-1.5 text-sm text-muted">{t.tax}</span>
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <dt className="w-16 shrink-0 text-sm font-bold text-ink-soft">{t.perYear}</dt>
                  <dd>
                    <Amount value={yearly.priceJpy} size="md" />
                    <span className="ml-1.5 text-sm text-muted">{t.tax}</span>
                  </dd>
                  {saved > 0 ? (
                    <dd>
                      <Badge tone="gold">{t.subscription.save(saved)}</Badge>
                    </dd>
                  ) : null}
                </div>
              </dl>
              <Benefits items={t.subscription.benefits(SUBSCRIPTION_PROFILES_PER_ACCOUNT)} className="text-ink-body" />
              {saved > 0 ? (
                <p className="tone-gold mt-6 flex items-start gap-2 rounded-2xl bg-tone/12 p-3 text-sm font-bold text-tone-ink ring-1 ring-tone/40 ring-inset">
                  <Icon name="gift" size={18} className="mt-0.5 shrink-0" />
                  <span>
                    <Phrases text={t.subscription.annual(saved)} />
                  </span>
                </p>
              ) : null}
              <div className="mt-auto pt-8">
                <Link
                  href={PLANS_HREF}
                  className="bg-flare inline-flex h-12 w-full items-center justify-center gap-2 rounded-control px-5 font-bold text-on-neon no-underline shadow-[0_4px_0_#9a6f22,0_0_22px_rgb(242_199_110/.35)] transition-[transform,box-shadow] duration-200 ease-glide hover:-translate-y-px active:translate-y-[3px] active:shadow-[0_1px_0_#9a6f22]"
                >
                  {t.subscription.cta}
                  <Icon name="arrow-right" tone="mono" size={20} />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </LandingSection>
  );
}
