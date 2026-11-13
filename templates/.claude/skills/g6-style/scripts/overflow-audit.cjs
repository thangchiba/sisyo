#!/usr/bin/env node
/**
 * Button overflow audit: every button-like element on the given pages, at several widths and languages. Reports
 *   1. content wider / taller than its button (a label spilling out, or clipped),
 *   2. a button sticking out of the nearest frame (a card, a sheet, anything drawn or clipping),
 *   3. a button past the screen edge.
 * Elements inside [data-scroll-x], .table-scroll, [aria-hidden="true"] and .sr-only are skipped (wide on purpose
 * or not seen). Expect a few false positives and look at each: a collapsed panel inside an overflow-hidden button
 * (its hidden text counts), sr-only text inside a step label, a fixed sheet compared with the card under it.
 *
 *   BASE=http://127.0.0.1:3000 ROUTES=/,/pricing,/login node overflow-audit.cjs
 *
 * Env: BASE (required), ROUTES (comma list, default "/"), WIDTHS (default 320,360,375,390,414,768,1024,1280),
 * LOCALES (comma list, default "default"), LOCALE_KEY (localStorage key the site reads its language from; each
 * locale is written there before the page loads), COOKIE ("name=value; name2=value2" for a signed-in session),
 * CHROME (Chrome path, default macOS Google Chrome), PUPPETEER (path to puppeteer-core if not resolvable).
 * Needs puppeteer-core (npm i -D puppeteer-core) and a Chrome.
 */
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');

const BASE = (process.env.BASE || '').replace(/\/$/, '');
if (!BASE) {
  console.error('BASE is required, e.g. BASE=http://127.0.0.1:3000');
  process.exit(2);
}
const ROUTES = (process.env.ROUTES || '/').split(',').map((r) => r.trim()).filter(Boolean);
const WIDTHS = (process.env.WIDTHS || '320,360,375,390,414,768,1024,1280').split(',').map(Number);
const LOCALES = (process.env.LOCALES || 'default').split(',');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function audit() {
  const vw = document.documentElement.clientWidth;
  const found = [];
  const transparent = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  for (const el of document.querySelectorAll('button, a, [role="button"], [role="switch"], input[type="submit"]')) {
    if (el.closest('[data-scroll-x], .table-scroll, [aria-hidden="true"], .sr-only')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const looksLikeButton =
      el.tagName === 'BUTTON' ||
      el.getAttribute('role') === 'button' ||
      el.getAttribute('role') === 'switch' ||
      !transparent(cs.backgroundColor) ||
      (cs.borderStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0) ||
      cs.boxShadow !== 'none';
    if (!looksLikeButton) continue;
    const label = (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const problems = [];
    const range = document.createRange();
    range.selectNodeContents(el);
    const cr = range.getBoundingClientRect();
    if (cr.width > 0 && (cr.right - r.right > 1.5 || r.left - cr.left > 1.5)) problems.push(`content ${Math.round(cr.width)} > box ${Math.round(r.width)}`);
    else if (cr.height > 0 && (cr.bottom - r.bottom > 1.5 || r.top - cr.top > 1.5)) problems.push(`content taller ${Math.round(cr.height)} > box ${Math.round(r.height)}`);
    else if (el.scrollWidth - el.clientWidth > 1 && cs.textOverflow !== 'ellipsis') problems.push(`scroll ${el.scrollWidth} > ${el.clientWidth}`);
    let frame = el.parentElement;
    while (frame && frame !== document.body) {
      const fcs = getComputedStyle(frame);
      const fr = frame.getBoundingClientRect();
      const drawn = !transparent(fcs.backgroundColor) || (fcs.borderStyle !== 'none' && parseFloat(fcs.borderTopWidth) > 0) || fcs.boxShadow !== 'none';
      if ((drawn || fcs.overflowX !== 'visible') && fr.width < vw - 1) {
        if (r.right - fr.right > 1.5 || fr.left - r.left > 1.5) {
          problems.push(`out of frame <${frame.tagName.toLowerCase()} class="${String(frame.className).slice(0, 60)}"> by ${Math.round(Math.max(r.right - fr.right, fr.left - r.left))}px`);
        }
        break;
      }
      frame = frame.parentElement;
    }
    if (r.right > vw + 1 || r.left < -1) problems.push(`off screen (${Math.round(r.left)}–${Math.round(r.right)} of ${vw})`);
    if (problems.length) found.push({ label, cls: String(el.className).slice(0, 90), problems });
  }
  return found;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const report = new Map();
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      if (process.env.LOCALE_KEY && locale !== 'default') {
        await page.evaluateOnNewDocument((k, l) => {
          try {
            localStorage.setItem(k, l);
          } catch {}
        }, process.env.LOCALE_KEY, locale);
      }
      if (process.env.COOKIE) {
        const url = new URL(BASE);
        await page.setCookie(...process.env.COOKIE.split(';').map((p) => p.trim()).filter(Boolean).map((p) => ({ name: p.split('=')[0], value: p.slice(p.indexOf('=') + 1), domain: url.hostname, path: '/' })));
      }
      for (const route of ROUTES) {
        try {
          await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });
          // Scroll through once so scroll-revealed content is on the page.
          await page.evaluate(async () => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 60));
            }
            window.scrollTo(0, 0);
          });
          await wait(600);
          for (const it of await page.evaluate(audit)) {
            const key = `${route} | ${it.label} | ${it.problems.map((p) => p.replace(/\d+/g, '#')).join('; ')}`;
            const prev = report.get(key) ?? { ...it, route, where: [] };
            prev.where.push(`${width}${locale === 'default' ? '' : locale}`);
            report.set(key, prev);
          }
        } catch (err) {
          console.log(`ERR ${route} ${width} ${locale}: ${err.message}`);
        }
      }
      await page.close();
    }
  }
  await browser.close();
  const rows = [...report.values()].sort((a, b) => a.route.localeCompare(b.route));
  for (const r of rows) console.log(`${r.route} | "${r.label}" | ${r.problems.join('; ')} | at ${r.where.join(',')} | ${r.cls}`);
  console.log(`\n${rows.length} distinct findings`);
  process.exit(rows.length ? 1 : 0);
})();
