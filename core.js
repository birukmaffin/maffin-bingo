/* MAFFIN BINGO - core logic (pure functions, testable in Node) */
(function (root) {
'use strict';
const LETTERS = ['B', 'I', 'N', 'G', 'O'];
const RANGES = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
const MIN_PRICE = 20;

/* Unbiased cryptographic random integer in [0, n) */
function rnd(n) {
  const a = new Uint32Array(1);
  const lim = Math.floor(4294967296 / n) * n;
  let x;
  do { crypto.getRandomValues(a); x = a[0]; } while (x >= lim);
  return x % n;
}

/* 25 numbers, row-major. Index 12 (centre) = 0 = FREE. Column c uses RANGES[c]. */
function genCardNums() {
  const cols = RANGES.map(([lo, hi]) => {
    const pool = [];
    for (let i = lo; i <= hi; i++) pool.push(i);
    for (let i = 0; i < 5; i++) {
      const j = i + rnd(pool.length - i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  });
  const g = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) g.push(cols[c][r]);
  g[12] = 0;
  return g;
}

const letterOf = n => LETTERS[Math.min(4, Math.floor((n - 1) / 15))];

/* All 12 possible lines as arrays of cell indexes */
const LINES = (() => {
  const L = [];
  for (let r = 0; r < 5; r++) L.push({ type: 'row', idx: r, cells: [0, 1, 2, 3, 4].map(c => r * 5 + c) });
  for (let c = 0; c < 5; c++) L.push({ type: 'col', idx: c, cells: [0, 1, 2, 3, 4].map(r => r * 5 + c) });
  L.push({ type: 'diag1', idx: 0, cells: [0, 6, 12, 18, 24] });
  L.push({ type: 'diag2', idx: 0, cells: [4, 8, 12, 16, 20] });
  return L;
})();

function winningLines(nums, calledSet) {
  const marked = i => i === 12 || calledSet.has(nums[i]);
  return LINES.filter(l => l.cells.every(marked));
}

/* 1-based index of the call on which this card first completed a line (0 = never) */
function firstWinCall(nums, calledArr) {
  const s = new Set();
  for (let k = 0; k < calledArr.length; k++) {
    s.add(calledArr[k]);
    if (winningLines(nums, s).length) return k + 1;
  }
  return 0;
}

const round2 = x => Math.round((x + Number.EPSILON) * 100) / 100;

function gameFinance(g) {
  let sold = 0;
  for (const s of g.sales) sold += s.cardIds.length;
  const revenue = round2(sold * g.price);
  const commission = round2(revenue * g.commission / 100);
  const prize = round2(revenue - commission);
  return { sold, revenue, commission, prize };
}

/* Amharic number words for 1..75 */
const AM_ONES = ['', 'አንድ', 'ሁለት', 'ሦስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const AM_TENS = { 10: 'አስር', 20: 'ሃያ', 30: 'ሰላሳ', 40: 'አርባ', 50: 'ሃምሳ', 60: 'ስድሳ', 70: 'ሰባ' };
function amNum(n) {
  if (n < 1 || n > 99) return String(n);
  if (n < 10) return AM_ONES[n];
  if (n === 10) return AM_TENS[10];
  if (n < 20) return 'አስራ ' + AM_ONES[n - 10];
  const t = Math.floor(n / 10) * 10, o = n % 10;
  return AM_TENS[t] + (o ? ' ' + AM_ONES[o] : '');
}
const AM_LETTERS = { B: 'ቢ', I: 'አይ', N: 'ኤን', G: 'ጂ', O: 'ኦ' };

/* "5, 8-12" -> {ids:[5,8,9,10,11,12], bad:[]} */
function parseIds(str, limit = 5000) {
  const ids = [], bad = [];
  String(str).split(/[,\s;]+/).filter(Boolean).forEach(tok => {
    const m = tok.match(/^#?(\d+)(?:-(\d+))?$/);
    if (!m) { bad.push(tok); return; }
    const a = +m[1], b = m[2] ? +m[2] : a;
    if (b < a || b - a > limit) { bad.push(tok); return; }
    for (let i = a; i <= b; i++) ids.push(i);
  });
  return { ids: [...new Set(ids)], bad };
}

/* Small synchronous SHA-256 (hex) used to store the PIN as a salted hash */
function sha256(str) {
  const bytes = new TextEncoder().encode(str);
  const primes = []; for (let n = 2; primes.length < 64; n++) if (primes.every(p => n % p)) primes.push(n);
  const frac = x => Math.floor((x - Math.floor(x)) * 4294967296);
  const K = primes.map(p => frac(Math.cbrt(p)));
  const H = primes.slice(0, 8).map(p => frac(Math.sqrt(p)));
  const l = bytes.length, total = (((l + 9 + 63) >> 6) << 6);
  const buf = new Uint8Array(total); buf.set(bytes); buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, (l * 8) >>> 0); dv.setUint32(total - 8, Math.floor(l * 8 / 4294967296));
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  const w = new Uint32Array(64);
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) >>> 0; });
  }
  return H.map(v => v.toString(16).padStart(8, '0')).join('');
}

const Core = { LETTERS, RANGES, MIN_PRICE, LINES, rnd, genCardNums, letterOf, winningLines, firstWinCall, round2, gameFinance, amNum, AM_LETTERS, parseIds, sha256 };
if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
