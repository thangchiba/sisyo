'use client';

import type { IconName } from '@/components/ui/Icon/Icon';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { defineMessages } from '@/lib/i18n';
import { useLocale, useMessages } from '@/lib/LocaleProvider';
import { LandingSection, Phrases } from './LandingSection';
import { Phone, PhoneScreen } from './Phone';
import { VISUALS } from './visuals';

type Benefit = { title: string; body: string; note?: string };

/**
 * Not only a business card: your own page, and the people you meet kept with it (owner, 2026-10-21: the
 * personal page of homepage v4 §4 and the contacts of §5 in one section, the benefits listed beside it).
 * Facts as in v4: Free adds Hokidon users to contacts; reading business cards (OCR) and the cards
 * sent through your form come with the plan; a contact saved to a phone does not update by itself.
 */
const messages = defineMessages({
  ja: {
    title: '名刺だけじゃない。あなたのページにも。',
    lead: 'デジタル名刺として渡すだけでなく、仕事や活動を紹介する自分のページとして。出会った相手とのつながりも、ここに残せます。',
    plan: 'プラン特典',
    benefits: {
      blog: { title: '簡単なブログとしても。', body: '文章・画像・カードを組み合わせて、仕事の近況や日々の活動を紹介できます。' },
      update: { title: '変わった情報は、すぐ反映。', body: '肩書きや連絡先が変わっても、ページを編集するだけ。名刺の刷り直しはいりません。' },
      connect: { title: '出会った相手を、連絡先に。', body: 'Hokidonを使っている相手を連絡先に追加して、つながりを一覧で管理できます。' },
      save: {
        title: '連絡先に保存してもらえる。',
        body: '相手はあなたのページから、連絡先をスマホに保存できます。',
        note: '端末に保存した連絡先は、自動更新されません。',
      },
      ocr: {
        title: '名刺交換も、すぐ記録。',
        body: '受け取った名刺を撮影すると、OCRが読み取ってフォームに入力。確認して保存すれば、自分のページで見返せます。フォームで届いた名刺情報も一覧に。',
      },
      privacy: { title: '見せる情報は自分で選べる。', body: '公開したい連絡先だけを載せられます。検索エンジンに表示しない設定も。' },
    },
    visual: { post: '新しい投稿', added: '連絡先に追加しました', reading: 'OCRで読み取り中' },
    paper: '紙の名刺と一緒にも。URLやQRを添えて、仕事や活動をもっと紹介できます。',
  },
  en: {
    title: 'More than a business card. Your own page, too.',
    lead: 'Hand it over as a digital business card, and use it as a page about your work and activities. Keep the people you meet in the same place.',
    plan: 'With the plan',
    benefits: {
      blog: { title: 'A simple blog, too.', body: 'Combine text, images and cards to share work updates and everyday activities.' },
      update: { title: 'Changes show right away.', body: 'New title or new number? Just edit your page. No reprinting business cards.' },
      connect: { title: 'Keep the people you meet.', body: 'Add other Hokidon users to your contacts and keep track of your connections in one list.' },
      save: {
        title: 'They can save your contact.',
        body: 'Visitors save your contact details to their phone from your page.',
        note: 'Contacts saved to a phone do not update automatically.',
      },
      ocr: {
        title: 'Record every card exchange.',
        body: 'Photograph a business card and OCR fills in the form. Check and save it, then find it again on your page. Cards sent through your form land in the same list.',
      },
      privacy: { title: 'You choose what to show.', body: 'List only the contact details you want public. You can also keep your page out of search engines.' },
    },
    visual: { post: 'New post', added: 'Added to contacts', reading: 'Reading with OCR' },
    paper: 'Use it alongside a paper card. Add your URL or QR to give people more to explore.',
  },
  vi: {
    title: 'Không chỉ là danh thiếp. Còn là trang của bạn.',
    lead: 'Vừa trao như một danh thiếp số, vừa là trang giới thiệu công việc và hoạt động của bạn. Những người bạn gặp cũng được lưu lại tại đây.',
    plan: 'Theo gói',
    benefits: {
      blog: { title: 'Cũng là một blog cơ bản.', body: 'Kết hợp chữ, ảnh và card để kể về công việc và hoạt động hằng ngày.' },
      update: { title: 'Thay đổi hiển thị ngay.', body: 'Đổi chức danh hay số điện thoại, chỉ cần sửa trang. Không phải in lại danh thiếp.' },
      connect: { title: 'Giữ lại liên hệ sau mỗi lần gặp.', body: 'Thêm người khác cũng dùng Hokidon vào danh bạ và quản lý kết nối trong một danh sách.' },
      save: {
        title: 'Người nhận lưu được liên hệ.',
        body: 'Người xem lưu thông tin liên hệ của bạn vào điện thoại ngay từ trang của bạn.',
        note: 'Liên hệ đã lưu trên điện thoại không tự cập nhật.',
      },
      ocr: {
        title: 'Lưu danh thiếp ngay khi trao đổi.',
        body: 'Chụp danh thiếp, OCR điền thông tin vào biểu mẫu. Kiểm tra và lưu để xem lại trên trang của bạn. Danh thiếp người khác gửi qua biểu mẫu cũng vào cùng danh sách.',
      },
      privacy: { title: 'Bạn chọn thông tin hiển thị.', body: 'Chỉ đăng những liên hệ muốn công khai. Có thể ẩn trang khỏi công cụ tìm kiếm.' },
    },
    visual: { post: 'Bài viết mới', added: 'Đã thêm vào danh bạ', reading: 'Đang đọc bằng OCR' },
    paper: 'Dùng cùng danh thiếp giấy. Chia sẻ thêm URL hoặc QR để người nhận tìm hiểu về bạn.',
  },
});

type Copy = (typeof messages)['ja'];

/** In page order; `plan` marks what comes with the plan (the Plans section names it). Tone = meaning. */
const BENEFITS: { key: keyof Copy['benefits']; icon: IconName; tone: 'iris' | 'aqua' | 'lime'; plan?: boolean }[] = [
  { key: 'blog', icon: 'file', tone: 'iris' },
  { key: 'update', icon: 'refresh', tone: 'iris' },
  { key: 'connect', icon: 'user-plus', tone: 'lime' },
  { key: 'save', icon: 'contact', tone: 'aqua' },
  { key: 'ocr', icon: 'scan', tone: 'aqua', plan: true },
  { key: 'privacy', icon: 'shield', tone: 'aqua' },
];

const CHIP = 'rounded-2xl bg-surface/90 shadow-float ring-1 ring-line backdrop-blur';

/**
 * The real profile in a phone, with three things floating around it: a blog post, a business card being read
 * by OCR (a scan line), a contact just added. Decorative: the list beside it says the same.
 */
function PageVisual({ visual }: { visual: Copy['visual'] }) {
  const { locale } = useLocale();
  return (
    <div className="relative mx-auto w-full max-w-[420px] py-6">
      <div
        aria-hidden="true"
        className="animate-aurora absolute inset-[6%] -z-10 rounded-full bg-[radial-gradient(closest-side,rgb(242_199_110/.3),rgb(226_164_124/.12)_60%,transparent)]"
      />
      <div className="mx-auto w-[56%]">
        <Phone className="shadow-[0_0_0_1px_rgb(255_255_255/.1),0_40px_90px_rgb(60_42_12/.3),0_0_60px_rgb(242_199_110/.22)]">
          <PhoneScreen visual={VISUALS.screens.profile} locale={locale} sizes="240px" />
        </Phone>
      </div>
      <div aria-hidden="true">
        {/* A blog post (text / image / card blocks). */}
        <div className="absolute top-[10%] left-0 w-[42%] animate-drift">
          <div className={`${CHIP} p-2.5`}>
            <p className="text-2xs font-bold text-neon-ink-iris">{visual.post}</p>
            <div className="mt-1.5 h-12 rounded-lg bg-[linear-gradient(135deg,#f6d58e,#e2a47c)]" />
            <p className="mt-1.5 h-1.5 w-4/5 rounded-full bg-ink-title/40" />
            <p className="mt-1 h-1.5 w-1/2 rounded-full bg-ink-title/20" />
          </div>
        </div>
        {/* A contact just added. */}
        <div className="absolute top-[44%] right-0 animate-drift [animation-delay:-2s]">
          <p className={`${CHIP} flex items-center gap-2 py-1.5 pr-3 pl-1.5 text-xs font-bold text-ink-title`}>
            <span className="tone-lime grid size-7 place-items-center rounded-xl bg-tone/15 ring-1 ring-tone/40 ring-inset">
              <Icon name="user-plus" size={16} />
            </span>
            {visual.added}
          </p>
        </div>
        {/* A business card under the OCR scan line. */}
        <div className="absolute bottom-[6%] left-[2%] w-[44%] animate-drift [animation-delay:-4s]">
          <div className={`${CHIP} p-2.5`}>
            <p className="flex items-center gap-1 text-2xs font-bold text-neon-ink-aqua">
              <Icon name="scan" size={12} />
              {visual.reading}
            </p>
            <div data-theme="light" className="relative mt-1.5 aspect-[91/55] overflow-hidden rounded-md bg-white p-1.5 ring-1 ring-black/10">
              <p className="h-1.5 w-1/2 rounded-full bg-[#1c1710]/70" />
              <p className="mt-1 h-1 w-1/3 rounded-full bg-[#1c1710]/30" />
              <p className="mt-2.5 h-1 w-2/3 rounded-full bg-[#1c1710]/25" />
              <p className="mt-1 h-1 w-1/2 rounded-full bg-[#1c1710]/25" />
              <span className="animate-scan absolute inset-x-0 top-0 h-0.5 bg-neon-ink-lime shadow-glow [--scan-travel:2.6rem]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The personal page and the connections in one section: the page on the left, what it does on the right. */
export function PersonalPage() {
  const t = useMessages(messages);
  return (
    <LandingSection id="page" eyebrow="More than a card" title={t.title} lead={t.lead}>
      <div className="mt-10 grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <Reveal>
          <PageVisual visual={t.visual} />
        </Reveal>
        <ul className="grid gap-3 sm:grid-cols-2">
          {BENEFITS.map((b, index) => {
            const copy: Benefit = t.benefits[b.key];
            return (
              <li key={b.key}>
                <Reveal delay={(index % 2) * 0.06 + Math.floor(index / 2) * 0.05} className="h-full">
                  <div className={`neon-card tone-${b.tone} group h-full p-4 transition-[transform,box-shadow] duration-300 ease-glide hover:-translate-y-0.5 hover:shadow-float sm:p-5`}>
                    <p className="flex items-center justify-between gap-2">
                      <span className="grid size-10 place-items-center rounded-xl bg-tone/12 ring-1 ring-tone/40 ring-inset transition-transform duration-300 ease-pop group-hover:scale-110">
                        <Icon name={b.icon} size={22} />
                      </span>
                      {b.plan ? <Badge tone="gold">{t.plan}</Badge> : null}
                    </p>
                    <h3 className="mt-3 font-bold text-ink-title">{copy.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-pretty text-muted [word-break:auto-phrase]">{copy.body}</p>
                    {copy.note ? <p className="mt-1.5 text-xs leading-relaxed text-muted/80 [word-break:auto-phrase]">{copy.note}</p> : null}
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
      <Reveal className="mt-8">
        <p className="mx-auto flex max-w-3xl items-start justify-center gap-2 text-center text-sm font-bold text-ink-soft">
          <Icon name="id-card" size={18} className="mt-0.5 shrink-0" />
          <span>
            <Phrases text={t.paper} />
          </span>
        </p>
      </Reveal>
    </LandingSection>
  );
}
