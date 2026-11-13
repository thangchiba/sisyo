'use client';

import clsx from 'clsx';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon/Icon';
import { defineMessages } from '@/lib/i18n';
import { useLocale, useMessages } from '@/lib/LocaleProvider';
import { Phone, PhoneScreen } from './Phone';
import { VISUALS } from './visuals';

const messages = defineMessages({
  ja: {
    urlLabel: 'あなたのプロフィールURL',
    url: (host: string) => `${host}/ユーザー名`,
    saved: '連絡先に保存しました',
    savedSub: '相手のスマホに、あなたの連絡先',
    qr: 'QRでも渡せる',
    noApp: 'アプリ不要',
  },
  en: {
    urlLabel: 'Your profile URL',
    url: (host: string) => `${host}/username`,
    saved: 'Saved to contacts',
    savedSub: 'Your details, on their phone',
    qr: 'Or hand it over by QR',
    noApp: 'No app needed',
  },
  vi: {
    urlLabel: 'URL hồ sơ của bạn',
    url: (host: string) => `${host}/tên-người-dùng`,
    saved: 'Đã lưu vào danh bạ',
    savedSub: 'Thông tin của bạn, trên máy người nhận',
    qr: 'Trao bằng mã QR',
    noApp: 'Không cần app',
  },
});

const CHIP = 'flex items-center gap-2 rounded-2xl bg-surface/90 py-1.5 pr-3 pl-1.5 shadow-float ring-1 ring-line backdrop-blur sm:py-2 sm:pr-3.5 sm:pl-2';

function ChipIcon({ name, tone }: { name: IconName; tone: 'aqua' | 'lime' | 'iris' }) {
  return (
    <span className={`tone-${tone} grid size-8 shrink-0 place-items-center rounded-xl bg-tone/15 ring-1 ring-tone/40 ring-inset sm:size-9`}>
      <Icon name={name} size={18} />
    </span>
  );
}

/**
 * One floating layer: enters with the page (CSS, no JS wait), then bobs on its own phase. It sits in front of
 * the front phone in the 3D stack (translateZ beyond its 60 px), or the phone would hide it.
 */
function Float({ className, delay, phase, children }: { className: string; delay: number; phase: number; children: ReactNode }) {
  return (
    <div className={clsx('absolute [transform:translateZ(90px)]', className)}>
      <div className="animate-rise" style={{ animationDelay: `${delay}s` }}>
        <div className="animate-drift" style={{ animationDelay: `${-phase}s` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Hero visual (landing v2): three real Hokidon screens in phones (the public profile in front, the links
 * step and the finished QR behind), chips for the ways to share it, a looping tap on 「連絡先に保存」 with
 * its toast. The stack tilts towards a mouse pointer and spreads as the hero scrolls away; with reduced
 * motion it stands still. The front screen can be the page's largest paint, so it loads with `priority`
 * and its phone has no entrance of its own.
 */
export function HeroVisual({ host }: { host: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { locale } = useLocale();
  const t = useMessages(messages);
  const { screens } = VISUALS;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 110, damping: 18, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), spring);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), spring);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const spreadLeft = useTransform(scrollYProgress, [0, 1], [0, -48]);
  const spreadRight = useTransform(scrollYProgress, [0, 1], [0, 48]);
  const sink = useTransform(scrollYProgress, [0, 1], [0, 56]);

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== 'mouse') return;
    const box = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - box.left) / box.width - 0.5);
    py.set((e.clientY - box.top) / box.height - 0.5);
  }
  function onPointerLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative mx-auto h-[430px] w-full max-w-[560px] [perspective:1400px] sm:h-[540px] lg:h-[600px]"
    >
      {/* Aurora: three soft neon pools drifting behind the phones (gradients, no blur filter). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 sm:-inset-12">
        <div className="animate-aurora absolute top-[4%] left-[6%] size-[62%] rounded-full bg-[radial-gradient(closest-side,rgb(236_214_166/.34),transparent)]" />
        <div className="animate-aurora absolute right-[2%] bottom-[6%] size-[58%] rounded-full bg-[radial-gradient(closest-side,rgb(226_164_124/.28),transparent)] [animation-delay:-6s]" />
        <div className="animate-aurora absolute top-[26%] right-[18%] size-[46%] rounded-full bg-[radial-gradient(closest-side,rgb(242_199_110/.32),transparent)] [animation-delay:-11s]" />
      </div>

      <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={reduce ? undefined : { rotateX, rotateY, y: sink }}>
        {/* Behind, left: the links step of the wizard. */}
        <motion.div className="absolute top-[13%] left-[1%] w-[35%] sm:left-[3%] sm:w-[34%]" style={reduce ? undefined : { x: spreadLeft }}>
          <div className="animate-rise" style={{ animationDelay: '0.35s' }}>
            <div className="-rotate-[8deg] opacity-95">
              <div className="animate-drift" style={{ animationDelay: '-2s' }}>
                <Phone>
                  <PhoneScreen visual={screens.links} locale={locale} sizes="(min-width: 640px) 190px, 35vw" />
                </Phone>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Behind, right: the finished profile with its QR. */}
        <motion.div className="absolute top-[10%] right-[1%] w-[35%] sm:right-[3%] sm:w-[34%]" style={reduce ? undefined : { x: spreadRight }}>
          <div className="animate-rise" style={{ animationDelay: '0.5s' }}>
            <div className="rotate-[8deg] opacity-95">
              <div className="animate-drift" style={{ animationDelay: '-4s' }}>
                <Phone>
                  <PhoneScreen visual={screens.doneQr} locale={locale} sizes="(min-width: 640px) 190px, 35vw" />
                </Phone>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Front: the public profile, with a looping tap on 「連絡先に保存」. */}
        <div className="absolute top-[3%] left-1/2 w-[44%] -translate-x-1/2 [transform:translateZ(60px)] sm:w-[42%]">
          <Phone className="shadow-[0_0_0_1px_rgb(255_255_255/.1),0_40px_90px_rgb(16_24_40/.36),0_0_70px_rgb(236_214_166/.22)]">
            <PhoneScreen visual={screens.profile} locale={locale} priority sizes="(min-width: 640px) 240px, 44vw" />
            {/* The tap lands on the button (measured on the capture: 43 % across, 62.7 % down). */}
            <span aria-hidden="true" className="absolute top-[62.7%] left-[43%] size-[22%] -translate-x-1/2 -translate-y-1/2">
              <span className="animate-tap absolute inset-0 rounded-full bg-white/70 ring-2 ring-white" />
            </span>
          </Phone>
        </div>

        {/* Chips: on phones the two that matter most, tucked into the edges; from sm all four. */}
        <Float className="top-[1%] right-0 z-10 sm:top-[4%] lg:-right-4" delay={0.7} phase={1}>
          <p className={CHIP}>
            <ChipIcon name="link" tone="aqua" />
            <span className="flex flex-col leading-tight">
              <span className="hidden text-2xs font-bold text-muted sm:block">{t.urlLabel}</span>
              <span className="font-display text-xs font-bold text-ink-title sm:text-sm">{t.url(host)}</span>
            </span>
          </p>
        </Float>
        <Float className="bottom-[22%] left-0 z-10 hidden sm:block lg:-left-6" delay={0.85} phase={3}>
          <p className={CHIP}>
            <ChipIcon name="qr" tone="aqua" />
            <span className="text-sm font-bold text-ink-title">{t.qr}</span>
          </p>
        </Float>
        <Float className="top-[40%] right-0 z-10 hidden sm:block lg:-right-8" delay={1} phase={4.5}>
          <p className={CHIP}>
            <ChipIcon name="smartphone" tone="iris" />
            <span className="text-sm font-bold text-ink-title">{t.noApp}</span>
          </p>
        </Float>
        {/* The toast answers the tap: same 5 s loop, so it shows right after the ring. */}
        <div className="absolute bottom-[2%] left-1/2 z-10 w-max -translate-x-1/2 [transform:translateZ(90px)] sm:bottom-[5%]">
          <div className="animate-toast" aria-hidden="true">
            <p className="flex items-center gap-2.5 rounded-2xl bg-[#15110b]/90 py-2 pr-4 pl-2 text-white shadow-float ring-1 ring-white/10 backdrop-blur">
              <span className="grid size-8 place-items-center rounded-xl bg-neon-lime/20 ring-1 ring-neon-lime/50 ring-inset">
                <Icon name="circle-check" tone="lime" size={18} />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold">{t.saved}</span>
                <span className="text-2xs text-white/70">{t.savedSub}</span>
              </span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
