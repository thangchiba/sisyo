'use client';

import { useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import { defineMessages } from '@/lib/i18n';
import { useLocale, useMessages } from '@/lib/LocaleProvider';
import type { LandingVideo } from './visuals';

const messages = defineMessages({
  ja: { close: '動画を閉じる' },
  en: { close: 'Close the video' },
  vi: { close: 'Đóng video' },
});

/**
 * A button that plays one landing video in a modal `<dialog>` (focus, Esc and the top layer come from
 * the browser). Nothing but the poster loads before the button is pressed (`preload="none"`), every byte
 * from the site's own `/demo/`; closing pauses it. With sound: the press is the user's gesture.
 */
export function VideoDialogButton({ video, className, children }: { video: LandingVideo; className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const { locale } = useLocale();
  const t = useMessages(messages);

  const open = () => {
    dialog.current?.showModal();
    void player.current?.play().catch(() => undefined);
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" className={className} onClick={open} aria-haspopup="dialog">
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-label={video.label[locale]}
        onClose={() => player.current?.pause()}
        // A press on the backdrop lands on the dialog itself; one on the video or the button does not.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-0 backdrop:bg-[rgb(5_6_10/.84)] backdrop:backdrop-blur-sm open:animate-pop-in"
      >
        <div className="relative">
          <video
            ref={player}
            // w-auto: the width attribute would otherwise beat aspect-ratio and letterbox the video.
            className="block aspect-[9/16] w-auto rounded-card bg-black shadow-float"
            style={{ height: 'min(86dvh, calc((100vw - 2rem) * 16 / 9))' }}
            width={720}
            height={1280}
            src={video.src}
            poster={video.poster}
            controls
            playsInline
            preload="none"
          />
          <button
            type="button"
            onClick={close}
            aria-label={t.close}
            className="absolute -top-3 -right-3 grid size-11 place-items-center rounded-full bg-surface text-ink-title shadow-float ring-1 ring-line transition-transform duration-200 ease-glide hover:scale-105"
          >
            <Icon name="close" tone="mono" size={20} />
          </button>
        </div>
      </dialog>
    </>
  );
}
