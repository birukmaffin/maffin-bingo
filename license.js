/* MAFFIN BINGO - per-device activation (offline). Verifies a code signed by Maffin Technologies. */
(function (root) {
'use strict';
const PUB = 'BOq7zQ5qMTvmghsdVxdbWFUZ8MqUlIk8tFSWgz/LjwXmCZjxu2PltM2swr5PFsgUvjda1NYdXaAVWzFTI+BFhW0=';
const K_LIC = 'maffin.v1.lic';           // deliberately NOT part of backups
const b64u = {
  dec: s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
};
function newDeviceId() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(r, x => A[x % A.length]).join('');
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 10);
}
function read() { try { return JSON.parse(localStorage.getItem(K_LIC) || '{}'); } catch (e) { return {}; } }
function write(o) { try { localStorage.setItem(K_LIC, JSON.stringify(o)); } catch (e) { /* ignore */ } }
function deviceId() { const o = read(); if (!o.dev) { o.dev = newDeviceId(); write(o); } return o.dev; }
const todayNum = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

/* code = base64url(payload) + "." + base64url(signature);  payload = "DEVICE|NAME|EXPIRY(YYYYMMDD or 0)" */
async function check(code, dev) {
  try {
    const [p, s] = String(code).replace(/\s+/g, '').split('.');
    if (!p || !s) return { ok: false, why: 'format' };
    const payloadBytes = b64u.dec(p), sig = b64u.dec(s);
    const raw = Uint8Array.from(atob(PUB), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('raw', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const good = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, payloadBytes);
    if (!good) return { ok: false, why: 'signature' };
    const [d, name, exp] = new TextDecoder().decode(payloadBytes).split('|');
    if (d !== dev) return { ok: false, why: 'device' };
    const e = parseInt(exp, 10) || 0;
    if (e && e < todayNum()) return { ok: false, why: 'expired', name, exp: e };
    return { ok: true, name, exp: e };
  } catch (err) { return { ok: false, why: 'format' }; }
}
/* status at start-up: {ok, name, exp, why, dev} */
async function status() {
  const o = read(), dev = deviceId(), now = Date.now();
  if (o.seen && now < o.seen - 2 * 864e5) return { ok: false, why: 'clock', dev };
  const o2 = read(); o2.seen = Math.max(o.seen || 0, now); write(o2);
  if (!o.code) return { ok: false, why: 'none', dev };
  const r = await check(o.code, dev); r.dev = dev; return r;
}
async function activate(code) {
  const dev = deviceId(), r = await check(code, dev); r.dev = dev;
  if (r.ok) { const o = read(); o.code = String(code).replace(/\s+/g, ''); write(o); }
  return r;
}
root.License = { status, activate, deviceId, check };
if (typeof module !== 'undefined' && module.exports) module.exports = root.License;
})(typeof window !== 'undefined' ? window : globalThis);
