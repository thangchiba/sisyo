#!/usr/bin/env node
/**
 * Finds the blank screen of a phone in a photo and prints the CSS matrix3d that maps a screen capture onto it, so
 * a real app screen can be composited into a generated photo (assets/screen-composite.html renders the result).
 *
 *   node fit-screen.cjs photo.png <seedX> <seedY> [captureWidth=900] [captureHeight=1948] [tolerance=48]
 *
 * seedX / seedY: any pixel inside the blank screen (look at the photo). The screen must be one flat colour and
 * unobstructed at its corners (ask the image model for "completely blank, uniform, flat very light grey screen,
 * all four corners visible"). `tolerance`: how far (sum of |ΔR|+|ΔG|+|ΔB|) a pixel may be from the seed's colour
 * and still be screen; raise it for a screen with a soft gradient, lower it when the fill leaks into the bezel.
 * How it works: flood fill of the pixels close to the seed's colour →
 * boundary pixels → for each side, a line fitted to the middle 60 % of its points (the rounded corners are left
 * out) → the four intersections = the sharp corners → homography from the capture rectangle to them. Needs ffmpeg.
 * Output: JSON { width, height, corners: {tl,tr,br,bl}, matrix3d }.
 */
const { execFileSync } = require('node:child_process');

const [file, sx, sy, cw = '900', ch = '1948', tol = '48'] = process.argv.slice(2);
if (!file || sx === undefined || sy === undefined) {
  console.error('usage: node fit-screen.cjs photo.png <seedX> <seedY> [captureWidth] [captureHeight]');
  process.exit(2);
}
const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim();
const [W, H] = probe.split(',').map(Number);
const rgb = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: W * H * 3 + 1024 });

// The screen's colour: the average of a 9×9 window around the seed.
let r0 = 0, g0 = 0, b0 = 0, n0 = 0;
for (let dy = -4; dy <= 4; dy++) {
  for (let dx = -4; dx <= 4; dx++) {
    const i = ((Number(sy) + dy) * W + Number(sx) + dx) * 3;
    r0 += rgb[i];
    g0 += rgb[i + 1];
    b0 += rgb[i + 2];
    n0++;
  }
}
r0 /= n0;
g0 /= n0;
b0 /= n0;
const TOL = Number(tol);
const bright = (x, y) => {
  const i = (y * W + x) * 3;
  return Math.abs(rgb[i] - r0) + Math.abs(rgb[i + 1] - g0) + Math.abs(rgb[i + 2] - b0) < TOL;
};

// Flood fill from the seed.
const mask = new Uint8Array(W * H);
const seen = new Uint8Array(W * H);
const stack = [[Number(sx), Number(sy)]];
let count = 0;
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  const k = y * W + x;
  if (seen[k]) continue;
  seen[k] = 1;
  if (!bright(x, y)) continue;
  mask[k] = 1;
  count++;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
if (count < 1000) {
  console.error(`only ${count} screen pixels around the seed: pick a seed inside the blank screen (or raise the tolerance)`);
  process.exit(1);
}
const inM = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] === 1;
const edge = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inM(x, y) && (!inM(x + 1, y) || !inM(x - 1, y) || !inM(x, y + 1) || !inM(x, y - 1))) edge.push([x, y]);

const by = (f) => edge.reduce((a, p) => (f(p) < f(a) ? p : a));
// First guess for a phone held roughly upright (works for tilts up to ~40°): the extreme points of the region.
let C = { tl: by((p) => p[0] + p[1]), tr: by((p) => -p[0] + p[1]), br: by((p) => -p[0] - p[1]), bl: by((p) => p[0] - p[1]) };
const fitLine = (a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const pts = edge.filter(([x, y]) => {
    const t = ((x - a[0]) * ux + (y - a[1]) * uy) / len;
    const d = Math.abs((x - a[0]) * uy - (y - a[1]) * ux);
    return t > 0.2 && t < 0.8 && d < 25;
  });
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) {
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
    sxy += (x - mx) * (y - my);
  }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { p: [mx, my], d: [Math.cos(th), Math.sin(th)] };
};
const meet = (l1, l2) => {
  const [x1, y1] = l1.p, [a1, b1] = l1.d, [x2, y2] = l2.p, [a2, b2] = l2.d;
  const t = ((x2 - x1) * b2 - (y2 - y1) * a2) / (a1 * b2 - b1 * a2);
  return [x1 + t * a1, y1 + t * b1];
};
for (let i = 0; i < 3; i++) {
  const T = fitLine(C.tl, C.tr), R = fitLine(C.tr, C.br), B = fitLine(C.br, C.bl), L = fitLine(C.bl, C.tl);
  C = { tl: meet(L, T), tr: meet(T, R), br: meet(R, B), bl: meet(B, L) };
}

// Homography: capture rectangle → quad, as a CSS matrix3d (column-major).
const src = [[0, 0], [Number(cw), 0], [Number(cw), Number(ch)], [0, Number(ch)]];
const dst = [C.tl, C.tr, C.br, C.bl];
const A = [], v = [];
for (let i = 0; i < 4; i++) {
  const [x, y] = src[i], [u, w] = dst[i];
  A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
  v.push(u);
  A.push([0, 0, 0, x, y, 1, -w * x, -w * y]);
  v.push(w);
}
for (let c = 0; c < 8; c++) {
  let piv = c;
  for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
  [A[c], A[piv]] = [A[piv], A[c]];
  [v[c], v[piv]] = [v[piv], v[c]];
  for (let r = 0; r < 8; r++) {
    if (r === c) continue;
    const f = A[r][c] / A[c][c];
    for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
    v[r] -= f * v[c];
  }
}
const h = v.map((val, i) => val / A[i][i]);
const m = [h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1];
const round = (p) => p.map((n) => Math.round(n * 10) / 10);
console.log(
  JSON.stringify(
    { width: W, height: H, corners: { tl: round(C.tl), tr: round(C.tr), br: round(C.br), bl: round(C.bl) }, matrix3d: m.map((n) => +n.toPrecision(9)).join(', ') },
    null,
    2,
  ),
);
