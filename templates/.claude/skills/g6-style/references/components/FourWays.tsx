'use client';

import { useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { IconName } from '@/components/ui/Icon/Icon';
import { Icon } from '@/components/ui/Icon/Icon';
import { LogoMark } from '@/components/ui/Logo';
import { Reveal } from '@/components/ui/Reveal';
import { defineMessages } from '@/lib/i18n';
import { useMessages } from '@/lib/LocaleProvider';
import { siteOrigin } from '@/lib/site';
import { LandingSection, Phrases } from './LandingSection';

type Way = { title: string; body: string };

/**
 * The four ways to the same page (homepage v4 §3; owner's rework 2026-10-21): each tile shows how it
 * works in a small animation and says it in two lines. Titles are the approved ones (smoke § 1 reads them).
 */
const messages = defineMessages({
  ja: {
    title: '4つの方法で、あなたのページへ。',
    lead: '会ったその場でも、オンラインでも。相手と場面に合わせて、同じプロフィールを共有できます。',
    ways: {
      qr: { title: 'QRを読み取る。', body: '画面に出したQRを、相手のスマホのカメラで読み取るだけ。アプリなしで、あなたのページが開きます。' },
      nfc: { title: 'NFCカードをかざす。', body: 'カードを相手のスマホ（対応機種）にかざすと、通知が表示されます。タップすれば、あなたのページへ。' },
      wallet: { title: 'ウォレットから見せる。', body: 'Apple WalletやGoogle ウォレットに入れたカードを開いて、QRを見せるだけ。すぐに取り出せます。' },
      url: { title: 'URLから開く。', body: 'メッセージやSNS、メールの署名にURLを。タップすれば、ブラウザであなたのページが開きます。' },
    },
    demo: {
      open: 'ページを開く',
      nfc: 'NFCタグ',
      openHost: (host: string) => `${host} を開く`,
      wallet: 'ウォレット',
      path: 'ユーザー名',
    },
    page: {
      eyebrow: 'あなたのページ',
      parts: ['自己紹介', '連絡先', 'SNS・リンク', 'ブログ'],
      closing: '渡し方は4つ。届くのは、あなたのページ。',
    },
  },
  en: {
    title: 'Four ways to reach your page.',
    lead: 'In person or online, choose how to share the same profile.',
    ways: {
      qr: { title: 'Scan a QR code.', body: 'Show the code on your screen and let them scan it with their phone camera. Your page opens, no app needed.' },
      nfc: { title: 'Tap an NFC card.', body: 'Hold your card near their phone (supported models) and a notification appears. One tap opens your page.' },
      wallet: { title: 'Share from your wallet.', body: 'Open your card in Apple Wallet or Google Wallet and show its QR code. Always one swipe away.' },
      url: { title: 'Open a direct link.', body: 'Put your URL in messages, social bios or your email signature. One tap opens your page in the browser.' },
    },
    demo: {
      open: 'Open page',
      nfc: 'NFC tag',
      openHost: (host: string) => `Open ${host}`,
      wallet: 'Wallet',
      path: 'yourname',
    },
    page: {
      eyebrow: 'Your page',
      parts: ['Bio', 'Contact', 'Social & links', 'Blog'],
      closing: 'Four ways to share. One page about you.',
    },
  },
  vi: {
    title: 'Bốn cách mở trang của bạn.',
    lead: 'Gặp trực tiếp hay kết nối online, chọn cách phù hợp để chia sẻ cùng một hồ sơ.',
    ways: {
      qr: { title: 'Quét QR.', body: 'Đưa mã QR trên màn hình cho người kia quét bằng camera điện thoại. Trang của bạn mở ra, không cần app.' },
      nfc: { title: 'Chạm thẻ NFC.', body: 'Chạm thẻ vào điện thoại người nhận (máy hỗ trợ), một thông báo hiện lên. Nhấn vào là mở trang của bạn.' },
      wallet: { title: 'Chia sẻ từ Wallet.', body: 'Mở thẻ trong Apple Wallet hoặc Google Wallet rồi đưa mã QR. Lấy ra chỉ trong một chạm.' },
      url: { title: 'Truy cập URL.', body: 'Gắn URL vào tin nhắn, mạng xã hội hay chữ ký email. Nhấn vào là trang của bạn mở trên trình duyệt.' },
    },
    demo: {
      open: 'Mở trang',
      nfc: 'Thẻ NFC',
      openHost: (host: string) => `Mở ${host}`,
      wallet: 'Wallet',
      path: 'ten-cua-ban',
    },
    page: {
      eyebrow: 'Trang của bạn',
      parts: ['Giới thiệu', 'Liên hệ', 'MXH & link', 'Blog'],
      closing: 'Bốn cách chia sẻ. Cùng một trang về bạn.',
    },
  },
});

type Demo = (typeof messages)['ja']['demo'];

/** The animation box at the top of each tile; decorative (the tile's text says the same). */
function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative h-40 overflow-hidden rounded-2xl bg-surface-2/70 ring-1 ring-line ${className ?? ''}`}>
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgb(242_199_110/.18),transparent_70%)]" />
      {children}
    </div>
  );
}

/** A small phone drawn in CSS; its screen stays light in both themes, like a real one. */
function MiniPhone({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`absolute rounded-[14px] bg-[#15110b] p-[3px] shadow-[0_10px_30px_rgb(20_14_4/.35),0_0_0_1px_rgb(255_255_255/.08)] ${className}`}>
      <div data-theme="light" className="relative size-full overflow-hidden rounded-[11px] bg-[#fffdf8]">
        <span className="absolute top-1 left-1/2 z-20 h-1.5 w-6 -translate-x-1/2 rounded-full bg-[#15110b]" />
        {children}
      </div>
    </div>
  );
}

/** A profile page in miniature: cover, avatar, name and a few rows. */
function MiniProfile() {
  return (
    <div className="absolute inset-0 bg-[#fffdf8]">
      <div className="h-[30%] bg-[linear-gradient(135deg,#f6d58e,#e2a47c)]" />
      <span className="absolute top-[18%] left-1/2 size-[30%] -translate-x-1/2 overflow-hidden rounded-full ring-2 ring-white">
        <LogoMark size={40} className="size-full rounded-full" />
      </span>
      <div className="mt-[22%] space-y-1 px-2">
        <p className="mx-auto h-1.5 w-1/2 rounded-full bg-[#3b3327]/70" />
        <p className="mx-auto h-1 w-1/3 rounded-full bg-[#3b3327]/30" />
        <p className="mt-2 h-3 rounded-[4px] bg-[#c2185b]/85" />
        <p className="h-2.5 rounded-[4px] bg-[#3b3327]/10" />
        <p className="h-2.5 rounded-[4px] bg-[#3b3327]/10" />
      </div>
    </div>
  );
}

/** QR: a real QR of the site's home page (scanning it opens Hokidon), a camera's frame and a scan line. */
function QrStage({ demo }: { demo: Demo }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '200px' });
  const [svg, setSvg] = useState('');
  useEffect(() => {
    if (!inView) return;
    // The library loads only when the tile comes near, never with the page (the share sheet does the same).
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toString(new URL('/', siteOrigin() || window.location.origin).toString(), {
          type: 'svg',
          margin: 0,
          errorCorrectionLevel: 'M',
          color: { dark: '#15110b', light: '#ffffff00' },
        }),
      )
      .then(setSvg, () => undefined);
  }, [inView]);
  const corner = 'absolute size-4 border-neon-ink-lime';
  return (
    <Stage>
      <div ref={ref} className="absolute top-4 left-1/2 -translate-x-1/2">
        <div data-theme="light" className="relative size-[104px] rounded-xl bg-white p-2.5 shadow-edge">
          {svg ? (
            // Our own SVG string from the qrcode library, not user input.
            <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="size-full rounded-md bg-[#15110b]/10" />
          )}
          <span className="animate-scan absolute inset-x-1.5 top-1.5 h-0.5 rounded-full bg-neon-ink-lime shadow-glow [--scan-travel:5.9rem]" />
        </div>
        {/* The camera's viewfinder around the code. */}
        <span className={`${corner} -top-2 -left-2 rounded-tl-md border-t-2 border-l-2`} />
        <span className={`${corner} -top-2 -right-2 rounded-tr-md border-t-2 border-r-2`} />
        <span className={`${corner} -bottom-2 -left-2 rounded-bl-md border-b-2 border-l-2`} />
        <span className={`${corner} -right-2 -bottom-2 rounded-br-md border-r-2 border-b-2`} />
      </div>
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2">
        <p className="animate-toast flex items-center gap-1.5 rounded-full bg-[#15110b] px-3 py-1 text-xs font-bold whitespace-nowrap text-white shadow-float">
          <Icon name="circle-check" tone="lime" size={14} />
          {demo.open}
        </p>
      </div>
    </Stage>
  );
}

/** NFC: the card slides to the back of a phone, rings spread from the contact, the notice drops in, the page opens. */
function NfcStage({ demo, host }: { demo: Demo; host: string }) {
  return (
    <Stage>
      <div className="absolute top-3 left-1/2 h-[136px] w-[180px] -translate-x-1/2">
        <div className="nfc-card absolute top-4 left-6 z-0 h-10 w-16 rounded-md bg-[linear-gradient(135deg,#2a2116,#120e09)] shadow-float ring-1 ring-[#f2c76e]/70">
          <span className="absolute top-1.5 left-1.5 h-2 w-3 rounded-sm bg-[linear-gradient(135deg,#fff3d1,#d4a24a)]" />
          <span className="absolute right-1.5 bottom-1.5 font-display text-[6px] font-bold tracking-[.2em] text-[#f6d58e]">NFC</span>
        </div>
        <span className="absolute top-8 left-[86px] z-10 size-14 -translate-x-1/2 -translate-y-1/2">
          <span className="nfc-ring absolute inset-0 rounded-full border-2 border-neon-ink-lime" />
          <span className="nfc-ring absolute inset-0 rounded-full border border-neon-ink-lime [animation-delay:.18s]" />
        </span>
        <MiniPhone className="top-0 left-[80px] z-10 h-[136px] w-[68px]">
          <div className="nfc-page absolute inset-0">
            <MiniProfile />
          </div>
          <div className="nfc-banner absolute inset-x-1 top-3 z-10 rounded-md bg-white/95 px-1.5 py-1 shadow-[0_4px_12px_rgb(20_14_4/.25)] ring-1 ring-black/5">
            <p className="text-[6px] leading-tight font-bold text-[#8a6211]">{demo.nfc}</p>
            <p className="truncate text-[7px] leading-tight font-bold text-[#1c1710]">{demo.openHost(host)}</p>
          </div>
        </MiniPhone>
      </div>
    </Stage>
  );
}

/** Wallet: a finger taps the Hokidon pass in the stack; it rises over the others and shows its QR. */
function WalletStage({ demo }: { demo: Demo }) {
  return (
    <Stage>
      <MiniPhone className="top-2.5 left-1/2 h-[144px] w-[74px] -translate-x-1/2">
        <p className="absolute top-3.5 left-2 text-[7px] font-bold text-[#1c1710]">{demo.wallet}</p>
        <span className="absolute inset-x-1.5 top-[18%] h-[36%] rounded-md bg-[linear-gradient(135deg,#e9dcc2,#cdb98f)]" />
        <span className="absolute inset-x-1.5 top-[29%] h-[36%] rounded-md bg-[linear-gradient(135deg,#d9a27c,#a8653f)]" />
        <div className="wallet-pass absolute inset-x-1.5 top-[17%] h-[74%] rounded-md bg-[linear-gradient(160deg,#2a2116,#120e09)] p-1.5 shadow-[0_-6px_16px_rgb(20_14_4/.35)] ring-1 ring-[#f2c76e]/60 [--stack-y:58%]">
          <p className="flex items-center gap-1">
            <LogoMark size={10} className="rounded-[3px]" />
            <span className="font-display text-[6px] font-bold tracking-[.18em] text-[#f6d58e]">HOKIDON</span>
          </p>
          <div className="wallet-qr mx-auto mt-2 grid size-10 place-items-center rounded-[4px] bg-white">
            <Icon name="qr" tone="mono" size={32} className="text-[#15110b]" />
          </div>
          <p className="mx-auto mt-1.5 h-1 w-2/3 rounded-full bg-[#f6d58e]/50" />
        </div>
        <span className="absolute top-[62%] left-1/2 z-10 size-8 -translate-x-1/2 -translate-y-1/2">
          <span className="wallet-tap absolute inset-0 rounded-full bg-white/70 ring-2 ring-[#f2c76e]" />
        </span>
      </MiniPhone>
    </Stage>
  );
}

type UrlPhase = 'typing' | 'loading' | 'done';

/** URL: the address is typed into a browser, the page loads; the loop runs only on screen. */
function UrlStage({ address }: { address: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6 });
  const reduce = useReducedMotion();
  const live = inView && !reduce;
  const [typed, setTyped] = useState(address.length);
  const [phase, setPhase] = useState<UrlPhase>('done');
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!live) {
      setTyped(address.length);
      setPhase('done');
      return;
    }
    let i = 0;
    setTyped(0);
    setPhase('typing');
    const timers: number[] = [];
    const tick = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i < address.length) return;
      window.clearInterval(tick);
      setPhase('loading');
      timers.push(window.setTimeout(() => setPhase('done'), 800));
      timers.push(window.setTimeout(() => setRound((r) => r + 1), 3600));
    }, 90);
    return () => {
      window.clearInterval(tick);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [live, address, round]);

  return (
    <Stage>
      <div ref={ref} className="absolute inset-x-3 top-3 bottom-3 overflow-hidden rounded-xl bg-surface shadow-edge ring-1 ring-line">
        <div className="flex items-center gap-1.5 border-b border-line px-2 py-1.5">
          <span className="size-1.5 rounded-full bg-neon-coral/70" />
          <span className="size-1.5 rounded-full bg-neon-amber/70" />
          <span className="size-1.5 rounded-full bg-neon-lime/80" />
          <p className="ml-1 flex min-w-0 flex-1 items-center gap-1 rounded-md bg-surface-2 px-1.5 py-1 text-[10px] ring-1 ring-line">
            <Icon name="lock" tone="mono" size={10} className="shrink-0 text-neon-ink-lime" />
            <span className="truncate font-display font-bold text-ink-title">{address.slice(0, typed)}</span>
            {phase === 'typing' ? <span className="h-3 w-px shrink-0 animate-pulse bg-ink-title" /> : null}
          </p>
        </div>
        <span
          className="bg-cta block h-0.5 origin-left transition-transform ease-out"
          style={{
            transform: `scaleX(${phase === 'typing' ? 0 : 1})`,
            opacity: phase === 'done' ? 0 : 1,
            transitionDuration: phase === 'loading' ? '700ms' : '0ms',
          }}
        />
        <div className={`px-3 pt-2 transition-opacity duration-500 ${phase === 'done' ? 'opacity-100' : 'opacity-0'}`}>
          <p className="flex items-center gap-2">
            <LogoMark size={22} className="rounded-full" />
            <span className="flex-1 space-y-1">
              <span className="block h-1.5 w-2/3 rounded-full bg-ink-title/60" />
              <span className="block h-1 w-1/3 rounded-full bg-ink-title/25" />
            </span>
          </p>
          <p className="mt-2 h-3 rounded-[4px] bg-[#c2185b]/80" />
          <p className="mt-1 h-2.5 rounded-[4px] bg-ink-title/10" />
        </div>
      </div>
    </Stage>
  );
}

const WAYS: { key: 'qr' | 'nfc' | 'wallet' | 'url'; icon: IconName }[] = [
  { key: 'qr', icon: 'qr' },
  { key: 'nfc', icon: 'nfc' },
  { key: 'wallet', icon: 'wallet' },
  { key: 'url', icon: 'link' },
];

function WayTile({ index, icon, copy, stage }: { index: number; icon: IconName; copy: Way; stage: ReactNode }) {
  return (
    <li>
      <Reveal delay={index * 0.08} className="h-full">
        <div className="neon-card neon-glow tone-lime group flex h-full flex-col p-3 transition-[transform,box-shadow] duration-300 ease-glide hover:-translate-y-1 hover:shadow-float sm:p-4">
          {stage}
          <p className="mt-4 flex items-center gap-2.5 px-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-tone/12 ring-1 ring-tone/40 ring-inset transition-transform duration-300 ease-pop group-hover:scale-110">
              <Icon name={icon} size={20} />
            </span>
            <span className="font-display text-xs font-semibold tracking-[.16em] text-muted">{String(index + 1).padStart(2, '0')}</span>
          </p>
          <h3 className="mt-2 px-1 text-lg font-bold text-ink-title">{copy.title}</h3>
          <p className="mt-1 px-1 pb-1 text-sm leading-relaxed text-pretty text-muted [word-break:auto-phrase]">{copy.body}</p>
        </div>
      </Reveal>
    </li>
  );
}

/** Where the four tiles' centres sit across a 1000-wide row (four columns), for the lines that meet below. */
const TILE_X = [125, 375, 625, 875];

/**
 * The four ways meeting at one page: gold lines run from each tile to a card that stands for "your page"
 * (a ring of light turning around it), with the closing line under it. Decorative apart from that line.
 */
function YourPage({ host, copy, path }: { host: string; copy: (typeof messages)['ja']['page']; path: string }) {
  return (
    <div className="mt-2">
      <svg aria-hidden="true" viewBox="0 0 1000 120" className="hidden h-auto w-full lg:block">
        {TILE_X.map((x, i) => {
          const d = `M${x} 0 C ${x} 80, 500 30, 500 120`;
          return (
            <g key={x}>
              <path d={d} pathLength={100} className="way-line" />
              <path d={d} pathLength={100} className="way-light" style={{ animationDelay: `${i * 0.35}s` }} />
            </g>
          );
        })}
      </svg>
      <p aria-hidden="true" className="flex justify-center pt-4 pb-3 lg:hidden">
        <span className="animate-drift grid size-10 place-items-center rounded-full bg-surface text-neon-ink-lime shadow-glow-sm ring-1 ring-neon-lime/50">
          <Icon name="arrow-down" tone="mono" size={20} />
        </span>
      </p>
      <Reveal className="mx-auto max-w-xl">
        <div className="neon-sweep rounded-[1.75rem]">
          <div className="neon-card neon-glow tone-lime relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] p-5 sm:gap-5 sm:p-6">
            <span className="relative shrink-0">
              <span aria-hidden="true" className="animate-glow-pulse absolute -inset-2 rounded-full bg-[radial-gradient(closest-side,rgb(242_199_110/.55),transparent)]" />
              <LogoMark size={64} className="relative rounded-full shadow-float" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xs font-semibold tracking-[.2em] text-neon-ink-lime uppercase">{copy.eyebrow}</p>
              <p className="mt-1 truncate font-display text-lg font-bold text-ink-title sm:text-xl">
                {host}/{path}
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {copy.parts.map((part) => (
                  <li key={part} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-ink-soft ring-1 ring-line">
                    {part}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal className="mt-6 text-center">
        <p className="text-xl font-bold sm:text-2xl">
          <span className="bg-flare-ink text-gradient">
            <Phrases text={copy.closing} />
          </span>
        </p>
      </Reveal>
    </div>
  );
}

/**
 * Right under the hero: QR, NFC, Wallet and URL all open the same profile. Each tile shows how in a small loop
 * (the code scanned, the card tapped, the pass opened, the address typed) and says it in words; none of it
 * pretends to be a button. Then the lines meet at "your page". The add-to-wallet buttons stay in マイページ.
 */
export function FourWays({ host }: { host: string }) {
  const t = useMessages(messages);
  const stages: Record<(typeof WAYS)[number]['key'], ReactNode> = {
    qr: <QrStage demo={t.demo} />,
    nfc: <NfcStage demo={t.demo} host={host} />,
    wallet: <WalletStage demo={t.demo} />,
    url: <UrlStage address={`${host}/${t.demo.path}`} />,
  };
  return (
    <LandingSection id="ways" band eyebrow="Share" title={t.title} lead={t.lead}>
      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WAYS.map((way, index) => (
          <WayTile key={way.key} index={index} icon={way.icon} copy={t.ways[way.key]} stage={stages[way.key]} />
        ))}
      </ul>
      <YourPage host={host} copy={t.page} path={t.demo.path} />
    </LandingSection>
  );
}
