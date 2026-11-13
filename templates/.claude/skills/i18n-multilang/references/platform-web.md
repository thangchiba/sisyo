# Web and apps (i18next)

The standard format **is** i18next's, so a site that already uses `i18next`, `react-i18next` or `next-i18next` needs
configuration, not conversion.

## Project setup

- `i18n/` at the repository root as everywhere ([layout-and-versioning.md](layout-and-versioning.md)), or point
  `localesDir` / `layout` at the folder the site already has:
  - one file per language (`src/i18n/locales/en.json`): `"layout": "{lang}.json"` (namespace `translation`)
  - per namespace (`public/locales/en/common.json`): `"layout": "{lang}/{ns}.json"`
- `capabilities: ["rtl", "shaping"]`: browsers render every script. All 40 languages are open, provided the layout is
  checked right-to-left (below).
- Use the registry codes. A site that used `jp` renames the folder to `ja` and redirects old URLs.

## i18next configuration

```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import manifest from '../../i18n/manifest.json'          // written by "i18n.py pack"

const ready = Object.entries(manifest.languages).filter(([, l]) => l.status === 'ready').map(([code]) => code)
const fallbackLng = Object.fromEntries(
  Object.entries(manifest.languages).map(([code, l]) => [code, l.fallback]),
)

i18n.use(initReactI18next).init({
  lng: pickLanguage(ready),                              // below
  supportedLngs: ready,
  fallbackLng: { ...fallbackLng, default: [manifest.fallbackLanguage] },
  load: 'currentOnly',                                   // "pt-BR" is a language, not "pt" + region
  ns: ['common'], defaultNS: 'common',
  interpolation: { escapeValue: false },                 // React escapes; keep the default {{ }} delimiters
  returnNull: false,
})
```

Keep i18next's defaults for everything the format relies on: `{{ }}` interpolation, `:` namespace separator, `.` key
separator, `_` plural separator, JSON v4 plurals.

Loading the texts, by size of the site:
- **Small site**: import the JSON of each language lazily (`import.meta.glob('../../i18n/locales/*/*.json')` in
  Vite, dynamic `import()` elsewhere) and `i18n.addResourceBundle(lng, ns, data)`. Nothing is fetched at runtime.
- **Larger site / translations updated without a deploy**: `i18next-http-backend` with
  `loadPath: '<cdn>/locales/{{lng}}/{{ns}}.json'` (the repository layout served as is), or fetch the pack file named
  in the CDN manifest and add each namespace: `Object.entries(pack.strings).forEach(([ns, s]) =>
  i18n.addResourceBundle(lng, ns, s, true, true))`. Flat dotted keys in the pack are read by i18next as they are.
- **Next.js**: `next-i18next` or the App Router's own i18n routing with the same files; locales list from the
  manifest.

## Choosing the language

```ts
function pickLanguage(ready: string[], wantedList = navigator.languages ?? [navigator.language]): string {
  const find = (code?: string) => code && ready.find(r => r.toLowerCase() === code.toLowerCase())
  const saved = find(localStorage.getItem('lang') ?? undefined)
  if (saved) return saved
  const alias = (code: string) => Object.keys(manifest.languages).find(k =>
    (manifest.languages[k].aliases ?? []).some(a => a.toLowerCase() === code.toLowerCase()))
  for (const wanted of wantedList) {
    let loc: Intl.Locale
    try { loc = new Intl.Locale(wanted).maximize() } catch { continue }     // zh-TW -> zh-Hant-TW
    const hit = find(wanted) ?? find(alias(wanted)) ?? find(`${loc.language}-${loc.script}`)
      ?? find(loc.language) ?? find(alias(loc.language))
      ?? (loc.language === 'zh' ? undefined : ready.find(r => r.split('-')[0] === loc.language))
    if (hit) return hit                                // es-MX -> es; pt-PT -> pt-BR when that is the only Portuguese
  }
  return find('en') ?? manifest.sourceLanguage
}
```

This is the matching rule of [languages.md](languages.md) in code (tested on zh-TW, zh-MY, pt-PT, es-MX, no, iw, tl
and others); a game ports the same steps. Save the choice when the user changes it (`localStorage`, and the account
profile if there is one). A URL that names a language (`/ja/…`) wins over both.

## Page-level rules

- `<html lang="{code}" dir="{ltr|rtl}">` updated on every language change (`dir` comes from the manifest).
- Right-to-left: use logical CSS (`margin-inline-start`, `padding-inline-end`, `text-align: start`), flip directional
  icons, test one Arabic page before declaring it done.
- Language switcher: the same picker rules as the games ([languages.md](languages.md)): searchable, rows
  `English name (native name)`, a globe icon. `Intl.DisplayNames` may add the name in the current language as a third
  search term.
- Numbers, dates, currency, lists and relative times: `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.ListFormat`,
  `Intl.RelativeTimeFormat` with the active language, then pass the result into a `{{placeholder}}`.
- Fonts: a font stack with system CJK / Thai / Arabic fallbacks; do not ship one webfont for all scripts.
- SEO for public pages: one URL per language (`/en/…`, `/ja/…`), `<link rel="alternate" hreflang="…">` for every
  ready language plus `x-default`, translated `<title>` and meta description (keep them in a `seo` namespace), and a
  sitemap that lists the alternates. Static sites are generated per language from the same
  locale files at build.
- Never build a sentence in JSX from fragments; use one key with placeholders, or `<Trans>` when markup must sit
  inside the sentence (web-only namespace, see [format.md](format.md)).

## Checks for a web project

- `python i18n.py check` in CI; `i18n.py pack` before a release so `manifest.json` is current.
- A script (or `i18next-parser` in check mode) that fails when the code uses a key the source lacks.
- A visual pass per new language on the main pages at phone width: overflow, clipped buttons, mixed directions.

## Apps

| App type | How it uses the standard |
|---|---|
| React Native, Electron, Capacitor | i18next exactly as above; packs bundled, optional CDN update |
| Native iOS / Android, Flutter | the texts are still authored in `i18n/locales` (one source, same translation loop). No exporter exists yet: when the first such app appears, add an export step to `pack` that writes `.xcstrings` / `strings.xml` / `.arb` from the locale files, and keep those generated files out of hand editing |
| Store listing (name, subtitle, description, keywords, what's new) | a `store` namespace translated with the same loop; note the stores' length limits in `notes/store.json` |
