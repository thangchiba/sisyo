'use client';

import { Icon, type IconName } from '@/components/ui/Icon/Icon';
import { defineMessages } from '@/lib/i18n';
import { useMessages } from '@/lib/LocaleProvider';

const messages = defineMessages({
  ja: { items: ['登録無料', 'アプリ不要', 'URLでシェア', 'QRコード', '連絡先に保存', 'いつでも更新', 'NFCカード（任意）', '日本語・English・Tiếng Việt'] },
  en: { items: ['Free to sign up', 'No app needed', 'Share by URL', 'QR code', 'Save contact', 'Update anytime', 'NFC card (optional)', '日本語・English・Tiếng Việt'] },
  vi: { items: ['Đăng ký miễn phí', 'Không cần app', 'Chia sẻ bằng link', 'Mã QR', 'Lưu vào danh bạ', 'Cập nhật bất cứ lúc nào', 'Thẻ NFC (tùy chọn)', '日本語・English・Tiếng Việt'] },
});

/** One icon per item of `messages.items`, in the same order. */
const ICONS: IconName[] = ['gift', 'smartphone', 'link', 'qr', 'contact', 'refresh', 'nfc', 'languages'];

/**
 * A slow strip of what Puro5 does, under the hero. Decorative (every item is said again further down), so
 * hidden from screen readers; two copies side by side make the loop seamless; stops with reduced motion.
 * `data-scroll-x`: wider than the screen on purpose, clipped here (check:mobile skips it).
 */
export function Marquee() {
  const t = useMessages(messages);
  const row = (
    <ul className="flex shrink-0 items-center gap-3 pr-3">
      {t.items.map((item, i) => (
        <li key={item} className="flex items-center gap-2 rounded-full bg-surface/80 px-4 py-2 text-sm font-bold whitespace-nowrap text-ink-title shadow-edge ring-1 ring-line">
          <Icon name={ICONS[i] ?? 'sparkles'} size={18} />
          {item}
        </li>
      ))}
    </ul>
  );
  return (
    <div aria-hidden="true" data-scroll-x className="relative overflow-hidden py-3">
      {/* Two strips of gold light frame it, like an LED band along a floor edge. */}
      <span className="led-line absolute inset-x-0 top-0" />
      <div className="animate-marquee flex w-max [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] hover:[animation-play-state:paused]">
        {row}
        {row}
      </div>
      <span className="led-line absolute inset-x-0 bottom-0" />
    </div>
  );
}
