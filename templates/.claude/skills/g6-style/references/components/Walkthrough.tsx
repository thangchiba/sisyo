'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { defineMessages } from '@/lib/i18n';
import { useLocale, useMessages } from '@/lib/LocaleProvider';
import { LandingSection, Phrases } from './LandingSection';
import { Phone } from './Phone';
import { PlayGlyph } from './PlayGlyph';
import { VISUALS, type Visual } from './visuals';

type StepCopy = { label: string; title: string; body: string };

/** Lines follow the narration of the how-to video (pro5/videos/puro5-howto/SCRIPT.md), which the owner accepted. */
const messages = defineMessages({
  ja: {
    title: '実際の画面で、4ステップ。',
    lead: 'ユーザー名を決めたら、ガイドに沿って入力するだけ。タップで、好きなステップから見られます。',
    steps: [
      { label: 'はじめに', title: 'ユーザー名を決める', body: 'これが、あなたのURLになります。半角英数字・ハイフン・アンダースコアで3〜30文字。' },
      { label: 'STEP 1', title: '写真', body: 'プロフィール写真と、カバー写真を選びます。あとから変更もできます。' },
      { label: 'STEP 2', title: '名前・肩書き', body: '名前とフリガナ、肩書き、会社名をここで入力。' },
      { label: 'STEP 3', title: '自己紹介', body: '何をしている人か、ひとことで。例文から選ぶこともできます。' },
      { label: 'STEP 4', title: 'リンク・連絡先', body: '電話やメール、SNSのリンクを追加。並べた順にプロフィールに表示されます。' },
      { label: '完成', title: 'すぐにシェア', body: 'QRコードやリンクで、すぐにシェアできます。編集はいつでもマイページから。' },
    ] satisfies StepCopy[],
    stepOf: (n: number, total: number) => `${n} / ${total}`,
    sample: '画面はデモ用サンプルです（桜井 翔太・架空の人物）',
    play: '操作画面を再生',
    pause: '一時停止',
  },
  en: {
    title: 'Four steps, on the real screens.',
    lead: 'Pick a username, then follow the guide. Tap any step to jump to it.',
    steps: [
      { label: 'First', title: 'Choose a username', body: 'It becomes your URL: 3 to 30 letters, digits, hyphens or underscores.' },
      { label: 'STEP 1', title: 'Photos', body: 'Choose a profile photo and a cover. You can change them later.' },
      { label: 'STEP 2', title: 'Name and title', body: 'Enter your name, its reading, your title and your company.' },
      { label: 'STEP 3', title: 'Bio', body: 'Say what you do in a line, or start from an example.' },
      { label: 'STEP 4', title: 'Links and contact', body: 'Add phone, email and social links. They show on your profile in the order you set.' },
      { label: 'Done', title: 'Share right away', body: 'Share by QR code or link straight away. Edit anytime from My page.' },
    ] satisfies StepCopy[],
    stepOf: (n: number, total: number) => `${n} / ${total}`,
    sample: 'Screens show a demo sample (Sakurai Shota, a made-up person)',
    play: 'Play the screens',
    pause: 'Pause',
  },
  vi: {
    title: 'Bốn bước, trên màn hình thật.',
    lead: 'Chọn tên người dùng rồi nhập theo hướng dẫn. Chạm vào bước bất kỳ để xem.',
    steps: [
      { label: 'Bắt đầu', title: 'Chọn tên người dùng', body: 'Đây sẽ là đường link của bạn: 3–30 ký tự gồm chữ, số, gạch ngang hoặc gạch dưới.' },
      { label: 'BƯỚC 1', title: 'Ảnh', body: 'Chọn ảnh đại diện và ảnh bìa. Có thể đổi lại sau.' },
      { label: 'BƯỚC 2', title: 'Tên và chức danh', body: 'Nhập tên, cách đọc, chức danh và tên công ty.' },
      { label: 'BƯỚC 3', title: 'Giới thiệu', body: 'Một câu về công việc của bạn, hoặc chọn từ câu mẫu.' },
      { label: 'BƯỚC 4', title: 'Link và liên hệ', body: 'Thêm điện thoại, email, mạng xã hội. Hồ sơ hiển thị theo thứ tự bạn sắp xếp.' },
      { label: 'Hoàn tất', title: 'Chia sẻ ngay', body: 'Chia sẻ ngay bằng mã QR hoặc đường link. Sửa bất cứ lúc nào ở Trang của tôi.' },
    ] satisfies StepCopy[],
    stepOf: (n: number, total: number) => `${n} / ${total}`,
    sample: 'Màn hình là dữ liệu mẫu (Sakurai Shota, nhân vật hư cấu)',
    play: 'Phát màn hình thao tác',
    pause: 'Tạm dừng',
  },
});

/** What the phone shows per step, in the order of `messages.steps`: a silent screen recording, or (last) a still. */
const MEDIA: { poster: Visual; clip: string | null }[] = [
  { poster: VISUALS.screens.username, clip: VISUALS.clips.username },
  { poster: VISUALS.screens.photo, clip: VISUALS.clips.photo },
  { poster: VISUALS.screens.name, clip: VISUALS.clips.name },
  { poster: VISUALS.screens.bio, clip: VISUALS.clips.bio },
  { poster: VISUALS.screens.links, clip: VISUALS.clips.links },
  { poster: VISUALS.screens.doneQr, clip: null },
];

/** How long the last step (a still) stays before the tour starts over. */
const STILL_MS = 4500;

/**
 * Product tour (landing v2): the real wizard, step by step. The phone plays the active step's screen
 * recording (silent, inline) and moves to the next when it ends; the list beside it shows where the tour
 * is and jumps on a tap. Owner, 2026-10-21: nothing plays or loads until the visitor presses ▶ or a step
 * (`preload="none"`, stills until then); it runs once through the steps while on screen, then rests; a
 * pause button stops it. This tour is the homepage's 使い方 again (back from v2, id `how`); the how-to
 * video under it comes back once it is remade (script: pro5/videos/hokidon-howto/SCRIPT.md).
 */
export function Walkthrough() {
  const t = useMessages(messages);
  const { locale } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const players = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  /** Nothing plays (or loads) until the visitor asks: the play button or a step (owner 2026-10-21). */
  const [started, setStarted] = useState(false);
  const playing = started && inView;
  const total = t.steps.length;
  const next = () => setActive((step) => (step + 1) % total);

  // Only the active clip plays, from its start; every other one waits paused (and loads nothing until its turn).
  useEffect(() => {
    setProgress(0);
    players.current.forEach((video, i) => {
      if (!video) return;
      if (i === active && playing) {
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [active, playing]);

  // The still at the end: a timer stands in for the clip.
  useEffect(() => {
    if (!playing || MEDIA[active]?.clip) return;
    const from = performance.now();
    const tick = window.setInterval(() => {
      const done = (performance.now() - from) / STILL_MS;
      if (done >= 1) {
        // One pass through the steps, then the tour rests on the first still again.
        window.clearInterval(tick);
        setActive(0);
        setStarted(false);
      } else {
        setProgress(done);
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [active, playing]);

  return (
    <LandingSection id="how" eyebrow="Step by step" title={t.title} lead={t.lead}>
      <div ref={ref} className="mt-10 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        {/* The phone: every step's media stacked, the active one on top. */}
        <Reveal className="relative mx-auto w-[66%] max-w-[300px] md:order-2 md:w-[72%]">
          <div
            aria-hidden="true"
            className="animate-aurora absolute -inset-[10%] -z-10 rounded-full md:-inset-[30%] bg-[radial-gradient(closest-side,rgb(242_199_110/.28),rgb(236_214_166/.14)_55%,transparent)]"
          />
          <Phone className="shadow-[0_0_0_1px_rgb(255_255_255/.1),0_40px_90px_rgb(16_24_40/.32),0_0_60px_rgb(236_214_166/.2)]">
            {MEDIA.map((media, i) => (
              <div
                key={media.poster.src}
                className={clsx('absolute inset-0 transition-opacity duration-500 ease-glide', i === active ? 'opacity-100' : 'opacity-0')}
                aria-hidden={i !== active}
              >
                <Image src={media.poster.src} alt={media.poster.alt[locale]} fill sizes="300px" className="object-cover object-top" />
                {media.clip ? (
                  <video
                    ref={(el) => {
                      players.current[i] = el;
                    }}
                    className="absolute inset-0 size-full object-cover object-top"
                    src={media.clip}
                    muted
                    playsInline
                    preload="none"
                    onTimeUpdate={(e) => {
                      if (i !== active) return;
                      const v = e.currentTarget;
                      if (v.duration) setProgress(v.currentTime / v.duration);
                    }}
                    onEnded={() => {
                      if (i === active) next();
                    }}
                  />
                ) : null}
              </div>
            ))}
            {started ? (
              <button
                type="button"
                onClick={() => setStarted(false)}
                aria-label={t.pause}
                className="absolute right-3 bottom-3 z-10 grid size-10 place-items-center rounded-full bg-[#15110b]/75 text-white shadow-float ring-1 ring-white/20 backdrop-blur"
              >
                <span aria-hidden="true" className="flex gap-1">
                  <span className="h-3.5 w-1 rounded-full bg-current" />
                  <span className="h-3.5 w-1 rounded-full bg-current" />
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="group absolute inset-0 z-10 grid place-items-center bg-[#15110b]/10 transition-colors duration-300 hover:bg-[#15110b]/20"
                data-testid="tour-play"
              >
                <span className="flex flex-col items-center gap-2">
                  <span className="relative grid place-items-center">
                    <span aria-hidden="true" className="animate-glow-pulse absolute size-20 rounded-full bg-neon-lime/40" />
                    <PlayGlyph size={56} className="relative drop-shadow-lg transition-transform duration-300 ease-pop group-hover:scale-110" />
                  </span>
                  <span className="rounded-full bg-[#15110b]/80 px-3 py-1 text-xs font-bold text-white shadow-float">{t.play}</span>
                </span>
              </button>
            )}
          </Phone>
          <p className="mt-4 text-center font-display text-sm font-bold text-ink-title tabular-nums">{t.stepOf(active + 1, total)}</p>
        </Reveal>

        {/* The steps: a tap jumps there; the active one carries a bar filling with its clip. */}
        <ol className="space-y-2 md:order-1">
          {t.steps.map((step, i) => {
            const current = i === active;
            return (
              <li key={step.title}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(i);
                    setStarted(true);
                  }}
                  aria-current={current ? 'step' : undefined}
                  className={clsx(
                    'relative w-full overflow-hidden rounded-2xl px-4 py-3 text-left transition-[background-color,box-shadow,opacity] duration-300 ease-glide',
                    current ? 'bg-surface shadow-edge ring-1 ring-neon-lime/70' : 'opacity-70 ring-1 ring-transparent hover:bg-surface/60 hover:opacity-100',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={clsx(
                        'grid size-8 shrink-0 place-items-center rounded-full font-display text-xs font-bold transition-colors duration-300',
                        current ? 'bg-cta text-on-neon shadow-glow-sm' : i < active ? 'bg-neon-lime/20 text-neon-ink-lime' : 'bg-surface-2 text-muted ring-1 ring-line',
                      )}
                    >
                      {i < active ? (
                        <Icon name="check" tone="mono" size={16} />
                      ) : i === 0 ? (
                        <Icon name="user" tone="mono" size={16} />
                      ) : i === total - 1 ? (
                        <Icon name="sparkles" tone="mono" size={16} />
                      ) : (
                        i
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-2xs font-bold tracking-[.14em] text-neon-ink-aqua uppercase">{step.label}</span>
                      <span className="block font-bold text-ink-title">{step.title}</span>
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'grid transition-[grid-template-rows,opacity] duration-500 ease-glide',
                      current ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <span className="overflow-hidden">
                      <span className="block pt-2 pl-11 text-sm leading-relaxed text-muted">
                        <Phrases text={step.body} />
                      </span>
                    </span>
                  </span>
                  {current ? (
                    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
                      <span className="bg-cta block h-full origin-left transition-transform duration-200 ease-linear" style={{ transform: `scaleX(${progress})` }} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          <li className="pt-1 pl-4 text-xs text-muted">※ {t.sample}</li>
        </ol>
      </div>
    </LandingSection>
  );
}
