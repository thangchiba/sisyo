'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiResult } from '@pro5/shared/api';
import {
  MEISHI_LIMITS,
  MEISHI_PHOTO_MAX_SIDE,
  MEISHI_READ_FIELDS,
  meishiProblems,
  type MeishiField,
  type MeishiReadFields,
  type MeishiReadResult,
} from '@pro5/shared/meishi';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon/Icon';
import { apiMessage, defineMessages } from '@/lib/i18n';
import { useLocale, useMessages } from '@/lib/LocaleProvider';

type Problem = 'required' | 'too_long' | 'invalid';

const messages = defineMessages({
  ja: {
    title: '名刺を渡す',
    lead: (owner: string) => `${owner}さんにあなたの名刺を送ります。入力は1分ほどで終わります。`,
    labels: { name: 'お名前', company: '会社名', title: '役職・部署', email: 'メールアドレス', phone: '電話番号', message: 'メッセージ' },
    placeholders: { name: '山田 太郎', company: '株式会社〇〇', title: '営業部 部長', email: 'taro@example.com', phone: '090-1234-5678', message: '本日はありがとうございました。' },
    nameHint: '名刺の写真を添えるときは空欄でもかまいません。',
    photo: '名刺の写真（任意）',
    photoHint: '紙の名刺を撮って添えられます。',
    takePhoto: '撮影する',
    choosePhoto: '写真を選ぶ',
    removePhoto: '写真を外す',
    photoAlt: '添付する名刺の写真',
    photoUnreadable: 'この画像は読み込めませんでした。別の写真でお試しください。',
    read: {
      title: '名刺を撮影して、自動で入力',
      hint: '写真から、お名前や会社名を読み取って入力します。送る前に内容を確認できます。',
      steps: ['名刺の傾きを補正しています…', '文字を読み取っています…', '項目を整理しています…'],
      done: '読み取りました。内容を確認してください。',
      review: '読み取りに自信のない箇所があります。特に確認してください。',
      failed: 'うまく読み取れませんでした。お手数ですが、入力してください。',
      retake: '撮り直す',
      note: '読み取りのため、写真は当社の文字認識システムで処理されます。',
    },
    yours: 'あなたの情報',
    consent: (owner: string) => `入力した内容と名刺の写真を${owner}さんに送ることに同意します。`,
    privacy: 'プライバシーポリシー',
    send: '名刺を送る',
    sending: '送信中…',
    problems: {
      required: 'お名前を入力するか、名刺の写真を添えてください。',
      too_long: (max: number) => `${max}文字以内で入力してください。`,
      invalid: { email: 'メールアドレスの形式が正しくありません。', phone: '電話番号の形式が正しくありません。' },
    },
    consentRequired: '送信するには同意が必要です。',
    failed: '送信できませんでした。時間をおいてもう一度お試しください。',
    doneTitle: '名刺を渡しました',
    done: (owner: string) => `${owner}さんに届きました。ありがとうございました。`,
    close: '閉じる',
  },
  en: {
    title: 'Give your business card',
    lead: (owner: string) => `Send your business card to ${owner}. It takes about a minute.`,
    labels: { name: 'Name', company: 'Company', title: 'Title / department', email: 'Email', phone: 'Phone', message: 'Message' },
    placeholders: { name: 'Taro Yamada', company: 'Example Inc.', title: 'Sales Manager', email: 'taro@example.com', phone: '+81 90-1234-5678', message: 'Great to meet you today.' },
    nameHint: 'You can leave it empty if you add a photo of your card.',
    photo: 'Photo of your card (optional)',
    photoHint: 'Take a picture of your paper card to add it.',
    takePhoto: 'Take a photo',
    choosePhoto: 'Choose a photo',
    removePhoto: 'Remove photo',
    photoAlt: 'Photo of the business card to send',
    photoUnreadable: "This image couldn't be read. Please try another photo.",
    read: {
      title: 'Snap your card to fill this in',
      hint: 'We read your name, company and more from the photo. You can check everything before sending.',
      steps: ['Straightening the card…', 'Reading the text…', 'Sorting the details…'],
      done: 'Done. Please check what was filled in.',
      review: 'Some parts were hard to read. Please check them carefully.',
      failed: "Couldn't read the card. Please type your details instead.",
      retake: 'Retake',
      note: 'To read it, the photo is processed by our own text recognition system.',
    },
    yours: 'Your details',
    consent: (owner: string) => `I agree to send what I entered and the photo of my card to ${owner}.`,
    privacy: 'Privacy policy',
    send: 'Send my card',
    sending: 'Sending…',
    problems: {
      required: 'Enter your name or add a photo of your card.',
      too_long: (max: number) => `Use ${max} characters or fewer.`,
      invalid: { email: 'This email address looks wrong.', phone: 'This phone number looks wrong.' },
    },
    consentRequired: 'Please agree before sending.',
    failed: "Couldn't send. Please try again later.",
    doneTitle: 'Card sent',
    done: (owner: string) => `${owner} has received your card. Thank you!`,
    close: 'Close',
  },
  vi: {
    title: 'Gửi danh thiếp của bạn',
    lead: (owner: string) => `Gửi danh thiếp của bạn cho ${owner}. Chỉ mất khoảng một phút.`,
    labels: { name: 'Họ tên', company: 'Công ty', title: 'Chức vụ / bộ phận', email: 'Email', phone: 'Số điện thoại', message: 'Lời nhắn' },
    placeholders: { name: 'Nguyễn Văn A', company: 'Công ty ABC', title: 'Trưởng phòng kinh doanh', email: 'a@example.com', phone: '090-1234-5678', message: 'Rất vui được gặp bạn hôm nay.' },
    nameHint: 'Có thể để trống nếu bạn đính kèm ảnh danh thiếp.',
    photo: 'Ảnh danh thiếp (không bắt buộc)',
    photoHint: 'Chụp danh thiếp giấy của bạn để đính kèm.',
    takePhoto: 'Chụp ảnh',
    choosePhoto: 'Chọn ảnh',
    removePhoto: 'Bỏ ảnh',
    photoAlt: 'Ảnh danh thiếp sẽ gửi',
    photoUnreadable: 'Không đọc được ảnh này. Vui lòng thử ảnh khác.',
    read: {
      title: 'Chụp danh thiếp để tự điền',
      hint: 'Hệ thống đọc tên, công ty… từ ảnh và điền giúp bạn. Bạn kiểm tra lại được trước khi gửi.',
      steps: ['Đang căn chỉnh danh thiếp…', 'Đang đọc chữ…', 'Đang sắp xếp thông tin…'],
      done: 'Đã đọc xong. Hãy kiểm tra nội dung đã điền.',
      review: 'Có chỗ đọc chưa chắc chắn. Hãy kiểm tra kỹ.',
      failed: 'Không đọc được danh thiếp. Vui lòng tự nhập thông tin.',
      retake: 'Chụp lại',
      note: 'Để đọc danh thiếp, ảnh được xử lý bằng hệ thống nhận dạng chữ của chúng tôi.',
    },
    yours: 'Thông tin của bạn',
    consent: (owner: string) => `Tôi đồng ý gửi thông tin đã nhập và ảnh danh thiếp cho ${owner}.`,
    privacy: 'Chính sách bảo mật',
    send: 'Gửi danh thiếp',
    sending: 'Đang gửi…',
    problems: {
      required: 'Hãy nhập họ tên hoặc đính kèm ảnh danh thiếp.',
      too_long: (max: number) => `Tối đa ${max} ký tự.`,
      invalid: { email: 'Email không đúng định dạng.', phone: 'Số điện thoại không đúng định dạng.' },
    },
    consentRequired: 'Bạn cần đồng ý trước khi gửi.',
    failed: 'Không gửi được. Vui lòng thử lại sau.',
    doneTitle: 'Đã gửi danh thiếp',
    done: (owner: string) => `${owner} đã nhận được danh thiếp của bạn. Cảm ơn bạn!`,
    close: 'Đóng',
  },
});

const FIELDS: { field: MeishiField; type: string; autoComplete: string; inputMode?: 'email' | 'tel' }[] = [
  { field: 'name', type: 'text', autoComplete: 'name' },
  { field: 'company', type: 'text', autoComplete: 'organization' },
  { field: 'title', type: 'text', autoComplete: 'organization-title' },
  { field: 'email', type: 'email', autoComplete: 'email', inputMode: 'email' },
  { field: 'phone', type: 'tel', autoComplete: 'tel', inputMode: 'tel' },
];

type Photo = { base64: string; preview: string };

/**
 * The photo as it is sent: decoded by the browser (so any format the phone can show, EXIF rotation
 * applied), scaled to ≤ 1600 px and re-encoded as JPEG. The API re-encodes it again (WebP, no
 * metadata, private), so this step only keeps the upload small on a phone connection.
 */
async function shrinkPhoto(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MEISHI_PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const preview = canvas.toDataURL('image/jpeg', 0.85);
  return { preview, base64: preview.slice(preview.indexOf(',') + 1) };
}

type ReadState = 'idle' | 'reading' | 'done' | 'failed';

/** Times the form asks again for a reading still running (each ask waits up to ~9 s on the server). */
const READ_ASKS = 6;
/** Between two fields filling in, so they come in one after the other, top to bottom. */
const FILL_STAGGER_MS = 260;
/** How long each line of the reading status stays before the next one. */
const STEP_MS = 1800;

/**
 * The card as the visitor fills it in. With `canRead` (owner 2026-10-21) the photo comes first: the card is
 * read on the server (POST /api/meishi/read, then GET …/:token while the workflow still runs) and each value
 * that comes back fills its field in turn, from a blur to sharp with a gold glow (`.meishi-fill`); a field the
 * visitor already typed in is left as it is. A card that cannot be read stays attached and the visitor types.
 */
export default function MeishiForm({
  open,
  onClose,
  username,
  ownerName,
  canRead = false,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  ownerName: string;
  canRead?: boolean;
}) {
  const t = useMessages(messages);
  const { locale } = useLocale();
  const [values, setValues] = useState<Record<MeishiField, string>>({ name: '', company: '', title: '', email: '', phone: '', message: '' });
  const [website, setWebsite] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [consent, setConsent] = useState(false);
  const [problems, setProblems] = useState<Partial<Record<MeishiField, Problem>>>({});
  const [consentMissing, setConsentMissing] = useState(false);
  const [error, setError] = useState<{ message?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [readState, setReadState] = useState<ReadState>('idle');
  const [readStep, setReadStep] = useState(0);
  const [needsReview, setNeedsReview] = useState(false);
  /** When each field was filled from the card: the key restarts its animation. */
  const [filled, setFilled] = useState<Partial<Record<MeishiField, number>>>({});
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  /** The latest reading: an answer for an older photo (retaken, removed) is dropped. */
  const readRun = useRef(0);
  const timers = useRef<number[]>([]);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // The status line moves on while the card is read, so a few seconds never look stuck.
  useEffect(() => {
    if (readState !== 'reading') return;
    const id = window.setInterval(() => setReadStep((n) => Math.min(n + 1, t.read.steps.length - 1)), STEP_MS);
    return () => window.clearInterval(id);
  }, [readState, t.read.steps.length]);

  const problemText = (field: MeishiField): string | undefined => {
    const p = problems[field];
    if (!p) return undefined;
    if (p === 'required') return t.problems.required;
    if (p === 'too_long') return t.problems.too_long(MEISHI_LIMITS[field]);
    return field === 'email' || field === 'phone' ? t.problems.invalid[field] : undefined;
  };

  /** Fills the fields one by one, top to bottom, skipping any the visitor already typed in. */
  function fill(fields: MeishiReadFields) {
    const order = MEISHI_READ_FIELDS.filter((f) => fields[f] && !valuesRef.current[f].trim());
    order.forEach((field, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setValues((prev) => (prev[field].trim() ? prev : { ...prev, [field]: fields[field] ?? '' }));
          setFilled((prev) => ({ ...prev, [field]: Date.now() }));
          setProblems((prev) => ({ ...prev, [field]: undefined }));
          if (i === 0) document.getElementById(`meishi-${field}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, i * FILL_STAGGER_MS),
      );
    });
    return order.length;
  }

  async function readCard(current: Photo) {
    const run = ++readRun.current;
    setReadState('reading');
    setReadStep(0);
    setNeedsReview(false);
    try {
      let res = await apiResult<MeishiReadResult>('/api/meishi/read', { body: { username, photo: current.base64 } });
      for (let ask = 0; ask < READ_ASKS && res.status === 200 && res.data?.status === 'processing'; ask++) {
        if (run !== readRun.current) return;
        res = await apiResult<MeishiReadResult>(`/api/meishi/read/${encodeURIComponent(res.data.token)}`);
      }
      if (run !== readRun.current) return;
      if (res.status === 200 && res.data?.status === 'done' && fill(res.data.fields) > 0) {
        setNeedsReview(res.data.needsReview);
        setReadState('done');
      } else {
        setReadState('failed');
      }
    } catch {
      if (run === readRun.current) setReadState('failed');
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setPhotoError(false);
    try {
      const shrunk = await shrinkPhoto(file);
      setPhoto(shrunk);
      setProblems((prev) => ({ ...prev, name: prev.name === 'required' ? undefined : prev.name }));
      if (canRead) void readCard(shrunk);
    } catch {
      setPhotoError(true);
    }
  }

  function removePhoto() {
    readRun.current += 1;
    setPhoto(null);
    setReadState('idle');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = meishiProblems(values, photo !== null);
    setProblems(found);
    setConsentMissing(!consent);
    if (Object.keys(found).length > 0 || !consent) return;
    setBusy(true);
    setError(null);
    try {
      const { status, data } = await apiResult<{ ok?: boolean; fields?: Partial<Record<MeishiField, Problem>>; message?: string }>('/api/meishi', {
        body: { username, ...values, photo: photo?.base64 ?? null, consent: true, website },
      });
      if (status === 200 && data?.ok) setDone(true);
      else if (data?.fields) setProblems(data.fields);
      else setError({ message: data?.message });
    } catch {
      setError({});
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <BottomSheet open={open} onClose={onClose} title={t.doneTitle}>
        <div className="flex flex-col items-center gap-3 py-4 text-center" data-testid="meishi-done">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon name="check" tone="mono" size={28} />
          </span>
          <p className="text-sm text-ink">{t.done(ownerName)}</p>
        </div>
        <Button size="lg" fullWidth className="mt-2" onClick={onClose}>
          {t.close}
        </Button>
      </BottomSheet>
    );
  }

  const reading = readState === 'reading';
  const pickButtons = (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => camera.current?.click()} disabled={reading}>
        <Icon name="camera" tone="mono" size={18} />
        {photo ? t.read.retake : t.takePhoto}
      </Button>
      {photo ? (
        <Button variant="ghost" onClick={removePhoto}>
          <Icon name="trash" tone="mono" size={16} />
          {t.removePhoto}
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => library.current?.click()}>
          <Icon name="image" tone="mono" size={18} />
          {t.choosePhoto}
        </Button>
      )}
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={t.title}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" data-testid="meishi-form">
        <p className="text-sm text-muted">{t.lead(ownerName)}</p>

        {/* The photo first (owner 2026-10-21): with reading on, it fills the fields below. */}
        <section className={clsx('rounded-2xl p-4 ring-1 ring-inset', canRead ? 'tone-lime bg-tone/8 ring-tone/45' : 'bg-surface-2/60 ring-line')} data-testid="meishi-photo-section">
          <p className="flex items-center gap-2 text-sm font-bold text-ink-title">
            <Icon name={canRead ? 'sparkles' : 'camera'} size={18} />
            {canRead ? t.read.title : t.photo}
          </p>
          {photo ? (
            <div className="mt-3">
              <div className="relative overflow-hidden rounded-xl bg-[#15110b] ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
                <img src={photo.preview} alt={t.photoAlt} className={clsx('mx-auto block max-h-52 w-auto object-contain transition-opacity duration-500', reading && 'opacity-80')} />
                {reading ? (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <span className="bg-sheen animate-shimmer absolute inset-y-0 left-0 w-1/3" />
                    <span className="meishi-scan absolute inset-x-0 h-0.5 bg-neon-lime shadow-glow" />
                  </span>
                ) : null}
              </div>
              {readState !== 'idle' ? (
                <p
                  role="status"
                  className={clsx(
                    'mt-2.5 flex items-start gap-2 text-sm font-bold',
                    readState === 'failed' ? 'text-warning' : readState === 'done' ? 'text-success' : 'text-ink-soft',
                  )}
                  data-testid="meishi-read-status"
                >
                  {reading ? (
                    <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-neon-lime border-t-transparent" />
                  ) : (
                    <Icon name={readState === 'done' ? 'circle-check' : 'info'} tone="mono" size={18} className="mt-0.5 shrink-0" />
                  )}
                  <span key={reading ? readStep : readState} className="animate-rise">
                    {reading ? t.read.steps[readStep] : readState === 'done' ? t.read.done : t.read.failed}
                    {readState === 'done' && needsReview ? <span className="mt-0.5 block text-xs font-normal text-warning">{t.read.review}</span> : null}
                  </span>
                </p>
              ) : null}
              <div className="mt-3">{pickButtons}</div>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs leading-relaxed text-muted">{canRead ? t.read.hint : t.photoHint}</p>
              <div className="mt-3">{pickButtons}</div>
            </>
          )}
          {canRead ? <p className="mt-3 text-2xs leading-relaxed text-muted">{t.read.note}</p> : null}
          {photoError ? <p className="mt-2 text-xs text-danger">{t.photoUnreadable}</p> : null}
          <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
          <input ref={library} type="file" accept="image/*" className="hidden" data-testid="meishi-photo" onChange={(e) => void pick(e.target.files?.[0])} />
        </section>

        <p className="text-sm font-bold text-ink-title">{t.yours}</p>
        {FIELDS.map(({ field, type, autoComplete, inputMode }) => (
          <Input
            key={`${field}-${filled[field] ?? 0}`}
            id={`meishi-${field}`}
            name={field}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            label={t.labels[field]}
            placeholder={t.placeholders[field]}
            maxLength={MEISHI_LIMITS[field]}
            value={values[field]}
            onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
            hint={field === 'name' ? t.nameHint : undefined}
            error={problemText(field)}
            className={filled[field] ? 'meishi-fill' : undefined}
            data-filled={filled[field] ? 'true' : undefined}
          />
        ))}
        <Textarea
          name="message"
          label={t.labels.message}
          placeholder={t.placeholders.message}
          rows={3}
          maxLength={MEISHI_LIMITS.message}
          value={values.message}
          onChange={(e) => setValues((prev) => ({ ...prev, message: e.target.value }))}
          error={problemText('message')}
        />

        {/* Not for people: a bot that fills every field fills this one too (the API then stores nothing). */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
          <input type="checkbox" className="mt-0.5 size-5 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="meishi-consent" />
          <span>
            {t.consent(ownerName)}
            <a href="/privacy" target="_blank" rel="noopener" className="ml-1 text-accent">
              {t.privacy}
            </a>
          </span>
        </label>
        {consentMissing && !consent ? <p className="-mt-2 text-xs text-danger">{t.consentRequired}</p> : null}
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {apiMessage(locale, error.message, t.failed)}
          </p>
        ) : null}
        <Button type="submit" size="lg" fullWidth disabled={busy || reading} data-testid="meishi-send">
          {busy ? t.sending : t.send}
        </Button>
      </form>
    </BottomSheet>
  );
}
