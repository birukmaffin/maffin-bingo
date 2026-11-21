/* MAFFIN BINGO - application (offline, local storage) */
(function () {
'use strict';
const { RANGES, LETTERS, MIN_PRICE, rnd, genCardNums, letterOf, winningLines, firstWinCall, gameFinance, round2, amNum, AM_LETTERS, parseIds, sha256 } = Core;
const I = window.I18N;
const APP_VERSION = '1.1.0';
const OWNER = { name: 'Biruk Haregewein', biz: 'Maffin Technologies', phones: ['0944686822', '0941681598'], address: 'Sendafa Beke city', email: 'jrmaffin@gmail.com', tg: 'Birukmaffin' };
let LIC = { ok: false }, displayOnly = false;

/* ---------- tiny helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, l = 2) => String(n).padStart(l, '0');
const pid = n => pad(n, 4);
let S = null, cards = [], cardMap = new Map();
const lang = () => (S && S.settings.lang) || 'en';
const t = (k, ...a) => { let s = (I[lang()] && I[lang()][k]) ?? I.en[k] ?? k; a.forEach((v, i) => { s = s.split('{' + i + '}').join(v); }); return s; };
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtD = ts => { const d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
const fmtT = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fmtDT = ts => fmtD(ts) + ', ' + fmtT(ts);
const num = n => new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const money = n => num(n) + ' ' + t('etb');
const dur = ms => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60); };

/* ---------- storage (local, automatic, with rolling previous copy) ---------- */
const K_MAIN = 'maffin.v1', K_PREV = 'maffin.v1.prev', K_CARDS = 'maffin.v1.cards';
function defaultState() {
  return { v: 1, created: Date.now(), games: [], settings: {
    lang: 'en', theme: 'dark', pinHash: null, salt: null, recHash: null, price: 20, commission: 20,
    voiceOn: true, voiceLang: 'en', volume: 1, rate: 0.9, sfx: true, autoSecs: 8, lastBackup: null, bizName: '', autoPause: false } };
}
function load() {
  let main = null, sawRaw = false;
  for (const k of [K_MAIN, K_PREV]) {
    try { const raw = localStorage.getItem(k); if (raw) { sawRaw = true; const o = JSON.parse(raw); if (o && o.v === 1 && Array.isArray(o.games)) { main = o; break; } } } catch (e) { /* try next */ }
  }
  if (!main && sawRaw) { try { localStorage.setItem('maffin.v1.corrupt', localStorage.getItem(K_MAIN) || ''); } catch (e) { /* ignore */ } }
  S = main || defaultState();
  S.settings = Object.assign(defaultState().settings, S.settings);
  try { cards = JSON.parse(localStorage.getItem(K_CARDS) || '[]'); if (!Array.isArray(cards)) cards = []; } catch (e) { cards = []; }
  cardMap = new Map(cards.map(c => [c.id, c]));
}
let saveWarned = false;
function save() {
  if (displayOnly) return;
  try {
    const prev = localStorage.getItem(K_MAIN);
    if (prev) localStorage.setItem(K_PREV, prev);
    localStorage.setItem(K_MAIN, JSON.stringify(S));
  } catch (e) { if (!saveWarned) { saveWarned = true; toast(t('saveFail'), 'err'); } }
}
function saveCards() { if (displayOnly) return; try { localStorage.setItem(K_CARDS, JSON.stringify(cards)); } catch (e) { toast(t('saveFail'), 'err'); } }

/* ---------- cards ---------- */
function generateCards(count) {
  const sigs = new Set(cards.map(c => c.n.join(',')));
  let id = cards.length ? cards[cards.length - 1].id : 0;
  const made = [];
  let guard = 0;
  while (made.length < count && guard++ < count * 50) {
    const n = genCardNums(), sig = n.join(',');
    if (sigs.has(sig)) continue;
    sigs.add(sig);
    const c = { id: ++id, n };
    made.push(c);
  }
  made.forEach(c => { cards.push(c); cardMap.set(c.id, c); });
  saveCards();
  return made;
}

/* ---------- games ---------- */
const gameById = id => S.games.find(g => g.id === id);
const activeGame = () => S.games.find(g => g.status === 'active');
const soldSet = g => { const s = new Set(); g.sales.forEach(x => x.cardIds.forEach(i => s.add(i))); return s; };
const saleOf = (g, id) => g.sales.find(s => s.cardIds.includes(id)) || null;
function newGame(price, commission) {
  const now = Date.now(), dk = dayKey(now).replace(/-/g, '');
  let seq = 1; while (gameById(`G-${dk}-${pad(seq, 3)}`)) seq++;
  const g = { id: `G-${dk}-${pad(seq, 3)}`, createdAt: now, startedAt: null, endedAt: null, status: 'upcoming', price, commission, sales: [], called: [], winner: null, cancelReason: '', resets: [] };
  S.games.push(g); save();
  return g;
}
const todaysGames = () => S.games.filter(g => dayKey(g.createdAt) === dayKey(Date.now()) && g.status !== 'cancelled');

/* ---------- PIN ---------- */
let unlockUntil = 0, pinFails = 0, lockedUntil = 0;
const hashPin = p => sha256((S.settings.salt || '') + ':' + p);
function setNewPin(p) {
  S.settings.salt = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16)).join('');
  S.settings.pinHash = hashPin(p);
  const rec = String(1e7 + rnd(9e7));
  S.settings.recHash = sha256('rec:' + rec);
  save(); unlockUntil = Date.now() + 5 * 60000;
  return rec;
}
async function requirePin() {
  if (!S.settings.pinHash || Date.now() < unlockUntil) return true;
  const r = await dialog({ title: t('enterPin'), body: '<input id="pin" type="password" inputmode="numeric" maxlength="8" class="inp pin" autocomplete="off"><div class="err" id="pinErr"></div>',
    buttons: [{ t: t('cancel'), v: null }, { t: t('forgotPin'), v: 'forgot' }, { t: t('unlock'), cls: 'green', collect: ov => {
      if (Date.now() < lockedUntil) { $('#pinErr', ov).textContent = t('tooMany'); return false; }
      const v = $('#pin', ov).value;
      if (hashPin(v) === S.settings.pinHash) { pinFails = 0; return 'ok'; }
      if (++pinFails >= 5) { lockedUntil = Date.now() + 30000; pinFails = 0; }
      $('#pinErr', ov).textContent = t('wrongPin'); $('#pin', ov).value = ''; sfx('err'); return false; } }] });
  if (r === 'ok') { unlockUntil = Date.now() + 5 * 60000; return true; }
  if (r === 'forgot') return recoverPin();
  return false;
}
async function recoverPin() {
  const r = await dialog({ title: t('forgotPin'), body: `<p class="muted">${t('recoverInfo')}</p><input id="rc" class="inp" inputmode="numeric" placeholder="${t('recoveryCode')}"><div class="err" id="rcErr"></div>`,
    buttons: [{ t: t('cancel'), v: null }, { t: t('next'), cls: 'green', collect: ov => { if (sha256('rec:' + $('#rc', ov).value.trim()) === S.settings.recHash) return 'ok'; $('#rcErr', ov).textContent = t('wrongCode'); return false; } }] });
  if (r !== 'ok') return false;
  return choosePin(true);
}
async function choosePin(sticky) {
  const r = await dialog({ sticky: !!sticky, title: t('createPin'), body: `<p class="muted">${t('pinInfo')}</p><label>${t('newPin')}</label><input id="p1" type="password" inputmode="numeric" maxlength="8" class="inp pin"><label>${t('confirmPin')}</label><input id="p2" type="password" inputmode="numeric" maxlength="8" class="inp pin"><div class="err" id="pErr"></div>`,
    buttons: [...(sticky ? [] : [{ t: t('cancel'), v: null }]), { t: t('save'), cls: 'green', collect: ov => {
      const a = $('#p1', ov).value, b = $('#p2', ov).value;
      if (!/^\d{4,8}$/.test(a)) { $('#pErr', ov).textContent = t('pinRule'); return false; }
      if (a !== b) { $('#pErr', ov).textContent = t('pinMismatch'); return false; }
      return a; } }] });
  if (!r) return false;
  const rec = setNewPin(r);
  await dialog({ title: t('recoveryCode'), body: `<p>${t('recoveryShow')}</p><div class="vbadge warn" style="font-size:30px;letter-spacing:6px;text-align:center">${rec}</div>`, buttons: [{ t: t('savedIt'), cls: 'green', v: true }] });
  return true;
}

/* ---------- modal dialog ---------- */
function dialog(o) {
  return new Promise(res => {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${o.title || ''}</h3><div class="mbody">${o.body || ''}</div><div class="mbtns"></div></div>`;
    const bt = $('.mbtns', ov); ov.btns = {};
    (o.buttons || [{ t: t('ok'), cls: 'green', v: true }]).forEach(b => {
      const x = document.createElement('button'); x.className = 'btn ' + (b.cls || 'ghost'); x.innerHTML = b.t;
      if (b.hidden) x.classList.add('hide');
      x.onclick = () => { let val = b.v; if (b.collect) { val = b.collect(ov); if (val === false) return; } ov.remove(); res(val); };
      bt.appendChild(x); if (b.k) ov.btns[b.k] = x;
    });
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !o.sticky) { ov.remove(); res(null); }
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const p = $('.btn.green', ov) || $('.btn.gold', ov); if (p) { e.preventDefault(); p.click(); } }
    });
    document.body.appendChild(ov);
    if (o.onopen) o.onopen(ov);
    const f = $('input:not([type=hidden]),select', ov); if (f) f.focus();
  });
}
const confirmBox = (title, msg, ok, danger) => dialog({ title, body: `<p>${msg}</p>`, buttons: [{ t: t('cancel'), v: false }, { t: ok || t('ok'), cls: danger ? 'red' : 'green', v: true }] });
let toastT;
function toast(msg, kind) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg; el.setAttribute('role', 'status'); document.body.appendChild(el);
  clearTimeout(toastT); toastT = setTimeout(() => el.remove(), 3200);
}

/* ---------- sound effects ---------- */
let actx;
function tone(seq, d = 0.12, type = 'sine', vol = 0.18) {
  if (!S.settings.sfx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    let at = actx.currentTime;
    seq.forEach(f => { const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol * S.settings.volume, at); g.gain.exponentialRampToValueAtTime(0.0001, at + d); o.connect(g); g.connect(actx.destination); o.start(at); o.stop(at + d); at += d * 0.9; });
  } catch (e) { /* audio not available */ }
}
function sfx(k) { ({ draw: () => tone([660, 880], .1), win: () => tone([523, 659, 784, 1047, 1319], .18, 'triangle'), err: () => tone([180, 140], .22, 'square', .1), click: () => tone([740], .05) }[k] || (() => 0))(); }

/* ---------- voice: Android native engine -> browser engine -> clear message ---------- */
let voices = [], voiceWarned = {}, voiceInfo = { engine: 'none', en: null, am: null }, lastVoiceErr = 0;
const nativeTTS = () => { const C = window.Capacitor; return (C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.TextToSpeech) || null; };
function loadVoices() { try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; } }
const findVoice = l => voices.find(v => { const x = v.lang.toLowerCase().replace('_', '-'); return x === l || x.startsWith(l + '-'); });
async function probeVoices() {
  const N = nativeTTS();
  if (N) {
    voiceInfo.engine = 'android';
    for (const [k, code] of [['en', 'en-US'], ['am', 'am-ET']]) {
      try { voiceInfo[k] = !!((await N.isLanguageSupported({ lang: code })).supported); } catch (e) { voiceInfo[k] = k === 'en' ? null : false; }
    }
  } else if (window.speechSynthesis) {
    loadVoices(); voiceInfo.engine = 'browser'; voiceInfo.en = voices.length ? !!findVoice('en') : null; voiceInfo.am = !!findVoice('am');
  } else voiceInfo.engine = 'none';
}
if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); probeVoices(); }; }
const amReady = () => voiceInfo.am === true;
const callText = (n, l) => l === 'am' ? `${AM_LETTERS[letterOf(n)]}፣ ${amNum(n)}` : `${letterOf(n)}. ${n}`;
function voiceError(e) { if (Date.now() - lastVoiceErr > 15000) { lastVoiceErr = Date.now(); toast(t('voiceFail') + (e && e.message ? ' (' + e.message + ')' : ''), 'err'); } }
async function speak(text, l) {
  const code = l === 'am' ? 'am-ET' : 'en-US', N = nativeTTS();
  if (N) {
    try { await N.speak({ text, lang: code, rate: S.settings.rate, pitch: 1.0, volume: S.settings.volume, queueStrategy: 0 }); return true; }
    catch (e) { voiceError(e); return false; }
  }
  if (!window.speechSynthesis) { voiceError(new Error(t('noEngine'))); return false; }
  return new Promise(res => {
    try {
      const ss = speechSynthesis; if (ss.speaking || ss.pending) ss.cancel();
      const u = new SpeechSynthesisUtterance(text), v = findVoice(l === 'am' ? 'am' : 'en');
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = code;
      u.volume = S.settings.volume; u.rate = S.settings.rate;
      u.onend = () => res(true); u.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') voiceError(new Error(e.error || 'speech')); res(false); };
      setTimeout(() => { try { ss.resume(); ss.speak(u); } catch (er) { voiceError(er); res(false); } }, 80);
    } catch (e) { voiceError(e); res(false); }
  });
}
async function announce(n, force) {
  if (!S.settings.voiceOn && !force) return;
  let l = S.settings.voiceLang;
  if (l === 'am' && !amReady()) { l = 'en'; if (!voiceWarned.am) { voiceWarned.am = 1; toast(t('noAmVoice'), 'err'); } }
  await speak(callText(n, l), l);
}
const vst = v => v === true ? ic('check') : v === false ? ic('xcircle') : ic('info');
function voiceStatusHTML() {
  const eng = { android: t('vAndroid'), browser: t('vBrowser'), none: t('vNone') }[voiceInfo.engine];
  return `${t('vEngine')}: <b>${eng}</b><br>${vst(voiceInfo.en)} English &nbsp; ${vst(voiceInfo.am)} አማርኛ${voiceInfo.am === false ? '<br>' + t('amVoiceMissing') : ''}${voiceInfo.en === false ? '<br>' + t('enVoiceMissing') : ''}`;
}

/* ---------- views ---------- */
let route = 'home', arg = '', justDrawn = false, autoTimer = null, timerInt = null, wake = null;
const go = r => { location.hash = '#/' + r; };
const logoSVG = w => window.crownSVG(w || 84);
const crownBW = '<svg viewBox="0 0 120 100"><path d="M10 80 L16 30 L41 54 L60 16 L79 54 L104 30 L110 80 Z" fill="#000"/><rect x="10" y="78" width="100" height="14" rx="5" fill="#000"/><circle cx="16" cy="26" r="7"/><circle cx="60" cy="11" r="8"/><circle cx="104" cy="26" r="7"/></svg>';
const statusChip = s => `<span class="chip ${s}">${t('st_' + s)}</span>`;

function topbar(title, back) {
  return `<header class="topbar"><button class="iconbtn" data-act="nav" data-to="${back || 'home'}" aria-label="${t('back')}">${ic('back')} </button><h2>${title}</h2><button class="langchip" data-act="lang" aria-label="${t('language')}">${lang() === 'en' ? 'አማ' : 'EN'}</button></header>`;
}

function homeView() {
  const tg = todaysGames();
  let sold = 0, rev = 0; tg.forEach(g => { const f = gameFinance(g); sold += f.sold; rev += f.revenue; });
  const ag = activeGame(), up = S.games.filter(g => g.status === 'upcoming').pop();
  const pg = ag || up; const pool = pg ? gameFinance(pg).prize : 0;
  const lb = S.settings.lastBackup;
  return `<div class="wrap">
  <div class="hero"><div class="logo">${logoSVG(86)}</div><div class="wordmark"><b>MAFFIN</b><span>BINGO</span></div>
   <div class="tools"><button class="langchip" data-act="lang" aria-label="${t('language')}">${lang() === 'en' ? 'አማርኛ' : 'English'}</button><button class="iconbtn" data-act="nav" data-to="help" aria-label="${t('help')}">?</button></div></div>
  <div class="stats">
   <div class="stat"><b>${tg.length}</b><span>${t('todayGames')}</span></div>
   <div class="stat"><b>${num(sold)}</b><span>${t('cardsSold')}</span></div>
   <div class="stat"><b>${num(rev)}</b><span>${t('todayRevenue')} (${t('etb')})</span></div>
   <div class="stat"><b>${num(pool)}</b><span>${t('currentPool')} (${t('etb')})</span></div>
  </div>
  <div class="tiles">
   <button class="tile primary" data-act="nav" data-to="new"><i>${ic('sparkle')} </i><span>${t('newGame')}<small>${t('newGameSub')}</small></span></button>
   <button class="tile" data-act="activeGame"><i>${ic('play')} </i><span>${t('activeGame')}<small>${ag ? esc(ag.id) : (up ? t('startUp') : t('noneActive'))}</small></span></button>
   <button class="tile" data-act="nav" data-to="cards"><i>${ic('ticket')} </i><span>${t('genCards')}<small>${num(cards.length)} ${t('inStock')}</small></span></button>
   <button class="tile" data-act="nav" data-to="players"><i>${ic('users')} </i><span>${t('players')}</span></button>
   <button class="tile" data-act="nav" data-to="history"><i>${ic('history')} </i><span>${t('history')}<small>${S.games.length} ${t('gamesWord')}</small></span></button>
   <button class="tile" data-act="nav" data-to="reports"><i>${ic('coin')} </i><span>${t('reports')}</span></button>
   <button class="tile" data-act="nav" data-to="settings"><i>${ic('sliders')} </i><span>${t('settings')}<small>${t('pinProtected')}</small></span></button>
   <button class="tile" data-act="nav" data-to="about"><i>${ic('info')} </i><span>${t('about')}<small>${OWNER.biz}</small></span></button>
   <button class="tile" data-act="nav" data-to="contact"><i>${ic('phone')} </i><span>${t('contactUs')}<small>${OWNER.phones[0]}</small></span></button>
  </div>
  <p class="foot">${OWNER.biz} · ${OWNER.phones[0]} · @${OWNER.tg}</p>
  ${(!lb || Date.now() - lb > 864e5) && S.games.length ? `<div class="banner">${ic('save')} ${lb ? t('backupOld', Math.floor((Date.now() - lb) / 864e5)) : t('backupNever')} <button class="btn sm gold" data-act="backup">${t('backupNow')}</button></div>` : ''}
  </div>`;
}

function newGameView() {
  const s = S.settings;
  return topbar(t('newGame')) + `<div class="wrap"><div class="panel"><h3>${t('gameSetup')}</h3>
   <label>${t('dateTime')}</label><input class="inp" disabled value="${fmtDT(Date.now())}">
   <label>${t('cardPrice')} (${t('etb')}) — ${t('min')} ${MIN_PRICE}</label><input id="ngPrice" class="inp" type="number" min="${MIN_PRICE}" step="1" value="${s.price}" disabled>
   <label>${t('commissionPct')}</label><input id="ngComm" class="inp" type="number" min="0" max="90" step="1" value="${s.commission}" disabled>
   <p class="muted" id="ngCalc"></p>
   <div class="row" style="margin-top:12px"><button class="btn gold" data-act="ngUnlock">${ic('unlock')} ${t('editPrice')}</button><button class="btn green grow" data-act="ngCreate">${ic('tick')} ${t('createGame')}</button></div></div>
   <div class="banner">${ic('info')} ${t('licenseNote')}</div></div>`;
}
function ngCalc() {
  const el = $('#ngCalc'); if (!el) return;
  const p = +$('#ngPrice').value || 0, c = +$('#ngComm').value || 0;
  const ex = 100 * p, cm = round2(ex * c / 100);
  el.textContent = t('example', money(ex), money(cm), money(round2(ex - cm)));
}

function cardHTML(card, o = {}) {
  const called = o.called || new Set(), win = o.win || new Set();
  let h = `<div class="bc"><div class="bch"><span>${t('cardNo')} ${pid(card.id)}</span><b>MAFFIN BINGO</b></div><table><tr>${LETTERS.map(l => `<th>${l}</th>`).join('')}</tr>`;
  for (let r = 0; r < 5; r++) {
    h += '<tr>';
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c, v = card.n[i];
      const cls = i === 12 ? 'free' : win.has(i) ? 'w' : called.has(v) ? 'm' : '';
      h += `<td class="${cls}">${i === 12 ? ic('crown') + ' ' + t('free') : v}</td>`;
    }
    h += '</tr>';
  }
  return h + '</table></div>';
}

/* lobby for an upcoming game */
function lobbyView(g) {
  const f = gameFinance(g), sold = soldSet(g);
  const sales = g.sales.map(s => `<div class="item"><div class="l1"><span>${esc(s.player)}${s.phone ? ' · ' + esc(s.phone) : ''}</span><span>${s.cardIds.length} × ${num(g.price)} = ${money(s.cardIds.length * g.price)}</span></div>
    <div class="l2">${fmtT(s.at)}</div><div class="ids">${s.cardIds.map(i => `<button class="idc sold" data-act="viewCard" data-id="${i}">${pid(i)}</button>`).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="printSale" data-sale="${s.id}">${ic('print')} ${t('print')}</button><button class="btn sm red" data-act="voidSale" data-sale="${s.id}">${ic('x')} ${t('voidSale')}</button></div></div>`).join('');
  return topbar(esc(g.id)) + `<div class="wrap">
   <div class="panel"><div class="row"><b class="grow">${fmtDT(g.createdAt)}</b>${statusChip(g.status)}</div>
    <div class="fin" style="margin-top:12px">${finBoxes(g, f)}</div></div>
   <div class="row" style="margin-bottom:14px"><button class="btn green grow" data-act="sell">${ic('ticket')} ${t('sellCards')}</button><button class="btn gold grow" data-act="startGame" ${f.sold ? '' : 'disabled'}>${ic('play')} ${t('startGame')}</button></div>
   <div class="panel"><h3>${t('sales')} (${sold.size})</h3>${sales || `<div class="empty">${t('noSales')}</div>`}
    <div class="row"><button class="btn ghost sm" data-act="printGame" ${sold.size ? '' : 'disabled'}>${ic('print')} ${t('printGameCards')}</button><button class="btn red sm" data-act="cancelGame">${t('cancelGame')}</button></div></div></div>`;
}
const finBoxes = (g, f) => `<div class="stat"><b>${num(f.sold)}</b><span>${t('cardsSold')} × ${num(g.price)}</span></div><div class="stat"><b>${num(f.revenue)}</b><span>${t('totalRevenue')}</span></div><div class="stat"><b>${num(f.commission)}</b><span>${t('commission')} ${g.commission}%</span></div><div class="stat"><b>${num(f.prize)}</b><span>${t('prizePool')} ${100 - g.commission}%</span></div>`;

const ballHTML = (n, pop) => { if (!n) return '<div class="ball empty"><span>?</span></div>'; const i = LETTERS.indexOf(letterOf(n)); return `<div class="ball b${i} ${pop ? 'pop' : ''}"><small>${letterOf(n)}</small><b>${n}</b></div>`; };
function boardHTML(called, last) {
  let h = '<div class="board">';
  for (let r = 0; r < 5; r++) { h += `<div class="brow"><div class="bl L${r}">${LETTERS[r]}</div>`; for (let c = 1; c <= 15; c++) { const n = r * 15 + c; h += `<div class="bn ${called.has(n) ? 'on' : ''} ${n === last ? 'last' : ''}">${n}</div>`; } h += '</div>'; }
  return h + '</div>';
}
function tvView(g, display) {
  if (!g) return `<div class="tv"><div class="empty">${t('notFound')}</div></div>`;
  const called = new Set(g.called), last = g.called[g.called.length - 1], f = gameFinance(g);
  const recent = g.called.slice(-9, -1).reverse();
  const biz = S.settings.bizName || LIC.name || '';
  return `<div class="tv"><div class="tvtop"><div class="tvbrand">${logoSVG(70)}<div><b>MAFFIN BINGO</b><span>${esc(biz)}</span></div></div>
   <div class="tvstat"><small>${t('prizePool')}</small><b>${num(f.prize)} ${t('etb')}</b></div>
   <div class="tvstat"><small>${t('called')}</small><b>${g.called.length}<em>/75</em></b></div></div>
   <div class="tvmain"><div class="tvleft">${ballHTML(last, justDrawn)}<div class="tvam">${last ? esc(callText(last, 'am')) : ''}</div>
     <div class="recent tvrecent">${recent.map(n => `<div class="mini"><span>${letterOf(n)}</span><b>${n}</b></div>`).join('')}</div></div>
    <div class="tvboard">${boardHTML(called, last)}</div></div>
   ${display ? '' : `<div class="tvctl"><button class="btn green" data-act="draw" ${g.status !== 'active' || g.called.length >= 75 ? 'disabled' : ''}>${ic('ball')} ${t('drawNext')}</button><button class="btn ghost" data-act="repeat">${ic('repeat')}</button><button class="btn ghost" data-act="fs">${ic('expand')}</button><button class="btn ghost" data-act="nav" data-to="game/${g.id}">${ic('x')} ${t('exitTv')}</button></div>`}</div>`;
}
function playView(g) {
  const called = new Set(g.called), f = gameFinance(g), last = g.called[g.called.length - 1];
  const recent = g.called.slice(-7, -1).reverse();
  const auto = !!autoTimer;
  const pw = pendingWinners(g);
  const alertPanel = pw.length ? `<section class="panel alertpanel"><h3>${ic('bell')} ${t('pendingTitle')} (${pw.length})</h3><p class="muted">${t('pendingInfo')}</p>
    ${pw.map(x => `<div class="item"><div class="l1"><span>${esc(x.sale.player)} · ${t('cardNo')} ${pid(x.card.id)}</span><button class="btn sm gold" data-act="verifyCard" data-id="${x.card.id}">${ic('trophy')} ${t('verify')}</button></div><div class="l2">${x.lines.map(lineName).join(', ')} · ${t('atCall', x.at)}</div></div>`).join('')}</section>` : '';
  const view = `<div class="play">${alertPanel}
   <section class="panel"><div class="stagetop"><span class="chip live">● ${t('st_active')}</span><span class="timer" id="timer">${dur(Date.now() - g.startedAt)}</span><span>${t('called')}: <b>${g.called.length}</b> · ${t('remaining')}: <b>${75 - g.called.length}</b></span></div>
    <div class="ballrow">${ballHTML(last, justDrawn)}<div><div class="amtxt">${last ? esc(callText(last, 'am')) : ''}</div><div class="recent">${recent.map(n => `<div class="mini"><span>${letterOf(n)}</span><b>${n}</b></div>`).join('')}</div></div></div>
    <div class="ctl"><button class="btn green xl" data-act="draw" ${g.called.length >= 75 ? 'disabled' : ''}>${ic('ball')} ${t('drawNext')}</button>
     <button class="btn gold" data-act="auto">${auto ? ic('pause') + ' ' + t('autoStop') : ic('play') + ' ' + t('autoStart', S.settings.autoSecs)}</button>
     <div class="manual"><input id="manualNo" class="inp" type="number" inputmode="numeric" min="1" max="75" placeholder="${t('manualPh')}"><button class="btn ghost" data-act="manual">${ic('pencil')} ${t('callManual')}</button></div>
     <div class="row"><button class="btn ghost sm grow" data-act="repeat">${ic('repeat')} ${t('repeat')}</button><button class="btn ghost sm grow" data-act="announceAny">${ic('speaker')} ${t('announceOnly')}</button><button class="btn ghost sm" data-act="voiceToggle">${S.settings.voiceOn ? ic('speaker') : ic('speakerOff')}</button><button class="btn ghost sm" data-act="fs" aria-label="${t('fullscreen')}">${ic('expand')}</button></div>
     <div class="row"><button class="btn ghost sm grow" data-act="nav" data-to="tv/${g.id}">${ic('tv')} ${t('tvMode')}</button>${window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() ? '' : `<button class="btn ghost sm grow" data-act="tvWin">${ic('cast')} ${t('tvWindow')}</button>`}</div></div></section>
   <section class="panel boardwrap"><h3>${t('board')}</h3>${boardHTML(called, last)}</section>
   <section class="side"><div class="fin">${finBoxes(g, f)}</div>
    <div class="panel" style="margin-top:14px"><h3>${t('history75')} (${g.called.length})</h3><div class="hist">${g.called.map(n => `<span class="hchip">${letterOf(n)}${n}</span>`).join('') || `<span class="muted">${t('nothingYet')}</span>`}</div></div>
    <div class="row"><button class="btn gold grow" data-act="verify">${ic('trophy')} ${t('verifyBingo')}</button><button class="btn ghost" data-act="endGame">${t('endNoWinner')}</button><button class="btn ghost" data-act="resetDraw">${ic('reset')} ${t('resetDraw')}</button><button class="btn red" data-act="cancelGame">${t('cancelGame')}</button></div></section></div>`;
  return topbar(esc(g.id), 'home') + `<div class="wrap">${view}</div>`;
}

/* completed / cancelled detail */
function detailView(g) {
  const f = gameFinance(g), called = new Set(g.called);
  const w = g.winner; const wc = w && cardMap.get(w.cardId);
  const wl = wc ? winningLines(wc.n, called) : [];
  const win = new Set(); wl.forEach(l => l.cells.forEach(i => win.add(i)));
  return topbar(esc(g.id), 'history') + `<div class="wrap">
   <div class="panel"><div class="row"><b class="grow">${fmtDT(g.createdAt)}</b>${statusChip(g.status)}</div>
    ${g.startedAt ? `<p class="muted">${t('started')}: ${fmtDT(g.startedAt)}${g.endedAt ? ' · ' + t('ended') + ': ' + fmtDT(g.endedAt) + ' · ' + dur(g.endedAt - g.startedAt) : ''}</p>` : ''}
    ${g.status === 'cancelled' ? `<p class="muted">${t('cancelled')}${g.cancelReason ? ': ' + esc(g.cancelReason) : ''}</p>` : ''}
    <div class="fin" style="margin-top:8px">${finBoxes(g, f)}</div></div>
   ${w ? `<div class="panel"><h3>${ic('trophy')} ${t('winner')}</h3><p><b>${esc(w.player)}</b> · ${t('cardNo')} ${pid(w.cardId)} · ${t('payout')}: <b>${money(w.prize)}</b></p><div style="text-align:center">${cardHTML(wc, { called, win })}</div></div>` : (g.status === 'completed' ? `<div class="banner">${t('noWinnerRecorded')}</div>` : '')}
   <div class="panel"><h3>${t('calledNumbers')} (${g.called.length})</h3><div class="hist" style="max-height:none">${g.called.map(n => `<span class="hchip">${letterOf(n)}${n}</span>`).join('') || `<span class="muted">${t('nothingYet')}</span>`}</div></div>
   <div class="panel"><h3>${t('sales')}</h3>${g.sales.map(s => `<div class="item"><div class="l1"><span>${esc(s.player)}</span><span>${s.cardIds.length}</span></div><div class="ids">${s.cardIds.map(i => `<button class="idc sold" data-act="viewCard" data-id="${i}">${pid(i)}</button>`).join('')}</div></div>`).join('') || `<div class="empty">${t('noSales')}</div>`}</div>
   <div class="row"><button class="btn gold grow" data-act="verify">${ic('search')} ${t('checkCard')}</button><button class="btn ghost grow" data-act="printGame" ${g.sales.length ? '' : 'disabled'}>${ic('print')} ${t('printGameCards')}</button></div></div>`;
}

function cardsView() {
  const gid = cardsFilter.game, g = gid && gameById(gid);
  const sold = g ? soldSet(g) : new Set();
  let list = cards;
  const q = cardsFilter.q.trim();
  if (q) list = list.filter(c => String(c.id).includes(q.replace('#', '')));
  if (g && cardsFilter.state === 'sold') list = list.filter(c => sold.has(c.id));
  if (g && cardsFilter.state === 'unsold') list = list.filter(c => !sold.has(c.id));
  const shown = list.slice(0, cardsFilter.limit);
  const opts = S.games.slice().reverse().map(x => `<option value="${x.id}" ${x.id === gid ? 'selected' : ''}>${esc(x.id)} (${t('st_' + x.status)})</option>`).join('');
  return topbar(t('genCards')) + `<div class="wrap">
   <div class="panel"><h3>${t('generate')}</h3><div class="manual"><input id="genQty" class="inp" type="number" min="1" max="500" value="50" inputmode="numeric"><button class="btn green" data-act="gen">＋ ${t('generate')}</button></div>
    <p class="muted">${t('genInfo')}</p></div>
   <div class="panel"><h3>${t('cardList')} — ${num(cards.length)}</h3>
    <div class="row"><input id="cardQ" class="inp grow" placeholder="${t('searchId')}" value="${esc(cardsFilter.q)}" inputmode="numeric">
     <select id="cardGame" class="inp grow"><option value="">${t('noGameFilter')}</option>${opts}</select></div>
    ${g ? `<div class="row" style="margin-top:8px"><select id="cardState" class="inp grow"><option value="all">${t('all')}</option><option value="sold" ${cardsFilter.state === 'sold' ? 'selected' : ''}>${t('soldCards')}</option><option value="unsold" ${cardsFilter.state === 'unsold' ? 'selected' : ''}>${t('unsoldCards')}</option></select>
     <span class="muted">${t('soldCards')}: <b>${sold.size}</b> · ${t('unsoldCards')}: <b>${cards.length - sold.size}</b></span></div>` : ''}
    <div class="ids" style="margin:12px 0">${shown.map(c => `<button class="idc ${g && sold.has(c.id) ? 'sold' : ''}" data-act="viewCard" data-id="${c.id}">${pid(c.id)}</button>`).join('') || `<div class="empty">${t('noCards')}</div>`}</div>
    ${list.length > shown.length ? `<button class="btn ghost sm" data-act="moreCards">${t('showMore')} (${list.length - shown.length})</button>` : ''}
    <div class="row" style="margin-top:12px"><button class="btn gold grow" data-act="printDialog" ${cards.length ? '' : 'disabled'}>${ic('print')} ${t('printCards')}</button></div></div></div>`;
}
const cardsFilter = { q: '', game: '', state: 'all', limit: 120 };

function playersView() {
  const map = new Map();
  S.games.forEach(g => { if (g.status === 'cancelled') return; g.sales.forEach(s => { const k = s.player.trim().toLowerCase(); const p = map.get(k) || { name: s.player, phone: s.phone, cards: 0, spent: 0, games: new Set() }; p.cards += s.cardIds.length; p.spent += s.cardIds.length * g.price; p.games.add(g.id); if (s.phone) p.phone = s.phone; map.set(k, p); }); });
  let arr = [...map.values()].sort((a, b) => b.spent - a.spent);
  const q = playerQ.trim().toLowerCase(); if (q) arr = arr.filter(p => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q));
  return topbar(t('players')) + `<div class="wrap"><input id="playerQ" class="inp" placeholder="${t('searchPlayer')}" value="${esc(playerQ)}" style="margin-bottom:12px">
   ${arr.map(p => `<button class="item" data-act="player" data-name="${esc(p.name)}"><div class="l1"><span>${esc(p.name)}</span><span>${money(p.spent)}</span></div><div class="l2">${p.phone ? esc(p.phone) + ' · ' : ''}${p.cards} ${t('cardsWord')} · ${p.games.size} ${t('gamesWord')}</div></button>`).join('') || `<div class="empty">${t('noPlayers')}</div>`}
   <div class="banner">${ic('info')} ${t('playersInfo')}</div></div>`;
}
let playerQ = '';
const histF = { q: '', st: 'all', from: '', to: '' };
function historyView() {
  let arr = S.games.slice().reverse();
  if (histF.st !== 'all') arr = arr.filter(g => g.status === histF.st);
  if (histF.from) arr = arr.filter(g => dayKey(g.createdAt) >= histF.from);
  if (histF.to) arr = arr.filter(g => dayKey(g.createdAt) <= histF.to);
  const q = histF.q.trim().toLowerCase();
  if (q) arr = arr.filter(g => g.id.toLowerCase().includes(q) || (g.winner && g.winner.player.toLowerCase().includes(q)) || g.sales.some(s => s.player.toLowerCase().includes(q)));
  return topbar(t('history')) + `<div class="wrap"><div class="panel"><input id="hq" class="inp" placeholder="${t('searchHist')}" value="${esc(histF.q)}">
   <div class="row" style="margin-top:8px"><select id="hst" class="inp grow">${['all', 'upcoming', 'active', 'completed', 'cancelled'].map(s => `<option value="${s}" ${histF.st === s ? 'selected' : ''}>${s === 'all' ? t('all') : t('st_' + s)}</option>`).join('')}</select>
   <input id="hfrom" type="date" class="inp grow" value="${histF.from}" aria-label="${t('from')}"><input id="hto" type="date" class="inp grow" value="${histF.to}" aria-label="${t('to')}"></div></div>
   ${arr.map(g => { const f = gameFinance(g); return `<button class="item" data-act="nav" data-to="game/${g.id}"><div class="l1"><span>${esc(g.id)}</span>${statusChip(g.status)}</div><div class="l2">${fmtDT(g.createdAt)} · ${f.sold} ${t('cardsWord')} · ${t('prizePool')}: ${money(f.prize)}${g.winner ? ' · ' + ic('trophy') + ' ' + esc(g.winner.player) + ' (' + pid(g.winner.cardId) + ')' : ''}</div></button>`; }).join('') || `<div class="empty">${t('noGames')}</div>`}</div>`;
}

/* ----- reports ----- */
const repF = { range: 'today', from: '', to: '' };
function repRange() {
  const now = new Date(), sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const r = repF.range, today = sod(now), DAY = 864e5;
  if (r === 'today') return [today, today + DAY - 1];
  if (r === '7') return [today - 6 * DAY, today + DAY - 1];
  if (r === '30') return [today - 29 * DAY, today + DAY - 1];
  if (r === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), today + DAY - 1];
  if (r === 'custom') { const a = repF.from ? new Date(repF.from + 'T00:00:00').getTime() : 0, b = repF.to ? new Date(repF.to + 'T23:59:59').getTime() : Date.now() + DAY; return [a, b]; }
  return [0, Date.now() + DAY];
}
function reportData() {
  const [a, b] = repRange();
  const gs = S.games.filter(g => g.createdAt >= a && g.createdAt <= b);
  const live = gs.filter(g => g.status !== 'cancelled');
  const days = new Map(); const tot = { games: 0, cards: 0, revenue: 0, commission: 0, paid: 0, unclaimed: 0, pending: 0, cancelled: gs.length - live.length };
  live.forEach(g => {
    const f = gameFinance(g), k = dayKey(g.createdAt);
    const d = days.get(k) || { day: k, games: 0, cards: 0, revenue: 0, commission: 0, paid: 0 };
    const paid = g.status === 'completed' && g.winner ? g.winner.prize : 0;
    d.games++; d.cards += f.sold; d.revenue += f.revenue; d.commission += f.commission; d.paid += paid; days.set(k, d);
    tot.games++; tot.cards += f.sold; tot.revenue += f.revenue; tot.commission += f.commission; tot.paid += paid;
    if (g.status === 'completed' && !g.winner) tot.unclaimed += f.prize;
    if (g.status === 'upcoming' || g.status === 'active') tot.pending += f.prize;
  });
  Object.keys(tot).forEach(k => tot[k] = round2(tot[k]));
  return { gs, live, days: [...days.values()].sort((x, y) => y.day.localeCompare(x.day)), tot };
}
function reportView() {
  const R = reportData(), all = S.games.filter(g => g.status !== 'cancelled'); let hist = 0; all.forEach(g => hist += gameFinance(g).revenue);
  const T = R.tot;
  return topbar(t('reports')) + `<div class="wrap"><div class="panel"><div class="row"><select id="repRange" class="inp grow">${[['today', t('rToday')], ['7', t('r7')], ['30', t('r30')], ['month', t('rMonth')], ['all', t('rAll')], ['custom', t('rCustom')]].map(([v, l]) => `<option value="${v}" ${repF.range === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
   ${repF.range === 'custom' ? `<div class="row" style="margin-top:8px"><input id="rfrom" type="date" class="inp grow" value="${repF.from}"><input id="rto" type="date" class="inp grow" value="${repF.to}"></div>` : ''}</div>
   <div class="fin" style="margin-bottom:14px"><div class="stat"><b>${T.games}</b><span>${t('gamesWord')}</span></div><div class="stat"><b>${num(T.cards)}</b><span>${t('cardsSold')}</span></div><div class="stat"><b>${num(T.revenue)}</b><span>${t('totalRevenue')}</span></div><div class="stat"><b>${num(T.commission)}</b><span>${t('commission')}</span></div></div>
   <div class="panel"><div class="sw"><span>${t('prizesPaid')}</span><b>${money(T.paid)}</b></div><div class="sw"><span>${t('pendingPools')}</span><b>${money(T.pending)}</b></div><div class="sw"><span>${t('unclaimedPools')}</span><b>${money(T.unclaimed)}</b></div><div class="sw"><span>${t('cancelledGames')}</span><b>${T.cancelled}</b></div><div class="sw"><span>${t('histRevenue')}</span><b>${money(hist)}</b></div></div>
   <div class="panel"><h3>${t('dailyRevenue')}</h3><div class="scroll"><table class="tb"><tr><th>${t('date')}</th><th>${t('gamesWord')}</th><th>${t('cardsWord')}</th><th>${t('totalRevenue')}</th><th>${t('commission')}</th><th>${t('prizesPaid')}</th></tr>
    ${R.days.map(d => `<tr><td>${d.day}</td><td>${d.games}</td><td>${d.cards}</td><td>${num(d.revenue)}</td><td>${num(d.commission)}</td><td>${num(d.paid)}</td></tr>`).join('') || `<tr><td colspan="6" class="muted">${t('noGames')}</td></tr>`}
    ${R.days.length ? `<tr class="tot"><td>${t('total')}</td><td>${T.games}</td><td>${T.cards}</td><td>${num(T.revenue)}</td><td>${num(T.commission)}</td><td>${num(T.paid)}</td></tr>` : ''}</table></div></div>
   <div class="panel"><h3>${t('perGame')}</h3><div class="scroll"><table class="tb"><tr><th>ID</th><th>${t('status')}</th><th>${t('cardsWord')}</th><th>${t('totalRevenue')}</th><th>${t('prizePool')}</th><th>${t('winner')}</th></tr>
    ${R.gs.slice().reverse().map(g => { const f = gameFinance(g); return `<tr><td>${esc(g.id)}</td><td>${t('st_' + g.status)}</td><td>${f.sold}</td><td>${num(f.revenue)}</td><td>${num(f.prize)}</td><td>${g.winner ? esc(g.winner.player) : '-'}</td></tr>`; }).join('')}</table></div></div>
   <div class="row"><button class="btn green grow" data-act="exportCsv">${ic('export')} ${t('exportCsv')}</button><button class="btn gold grow" data-act="printReport">${ic('print')} ${t('printReport')}</button></div></div>`;
}
function reportCSV() {
  const R = reportData(), q = v => '"' + String(v).replace(/"/g, '""') + '"', rows = [];
  rows.push(['MAFFIN BINGO', 'Financial report', new Date().toISOString()].map(q).join(','));
  rows.push(['Date', 'Games', 'Cards sold', 'Revenue ETB', 'Commission ETB', 'Prizes paid ETB'].map(q).join(','));
  R.days.forEach(d => rows.push([d.day, d.games, d.cards, d.revenue, d.commission, d.paid].map(q).join(',')));
  rows.push(['Total', R.tot.games, R.tot.cards, R.tot.revenue, R.tot.commission, R.tot.paid].map(q).join(','));
  rows.push('');
  rows.push(['Game ID', 'Created', 'Status', 'Price', 'Commission %', 'Cards sold', 'Revenue', 'Commission', 'Prize pool', 'Winner', 'Winner card'].map(q).join(','));
  R.gs.forEach(g => { const f = gameFinance(g); rows.push([g.id, fmtDT(g.createdAt), g.status, g.price, g.commission, f.sold, f.revenue, f.commission, f.prize, g.winner ? g.winner.player : '', g.winner ? pid(g.winner.cardId) : ''].map(q).join(',')); });
  return '\ufeff' + rows.join('\r\n');
}

/* ----- settings ----- */
function settingsView() {
  const s = S.settings;
  let used = 0; try { used = (localStorage.getItem(K_MAIN) || '').length + (localStorage.getItem(K_CARDS) || '').length; } catch (e) { /* */ }
  return topbar(t('settings')) + `<div class="wrap">
   <div class="panel"><h3>${t('language')}</h3><div class="row"><button class="btn ${s.lang === 'en' ? 'gold' : 'ghost'} grow" data-act="setLang" data-v="en">English</button><button class="btn ${s.lang === 'am' ? 'gold' : 'ghost'} grow" data-act="setLang" data-v="am">አማርኛ</button></div>
    <div class="sw"><span>${t('theme')}</span><select class="inp" style="width:auto" data-set="theme"><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>${t('dark')}</option><option value="light" ${s.theme === 'light' ? 'selected' : ''}>${t('light')}</option></select></div>
    <div class="sw"><span>${t('fullscreen')}</span><button class="btn sm ghost" data-act="fs">${ic('expand')} ${t('toggle')}</button></div></div>
   <div class="panel"><h3>${t('voice')}</h3>
    <div class="sw"><span>${t('voiceOn')}</span><input type="checkbox" data-set="voiceOn" ${s.voiceOn ? 'checked' : ''}></div>
    <div class="sw"><span>${t('voiceLang')}</span><select class="inp" style="width:auto" data-set="voiceLang"><option value="en" ${s.voiceLang === 'en' ? 'selected' : ''}>English</option><option value="am" ${s.voiceLang === 'am' ? 'selected' : ''}>አማርኛ</option></select></div>
    <label>${t('volume')}: ${Math.round(s.volume * 100)}%</label><input type="range" min="0" max="1" step="0.05" value="${s.volume}" data-set="volume">
    <label>${t('speed')}: ${s.rate}</label><input type="range" min="0.5" max="1.5" step="0.1" value="${s.rate}" data-set="rate">
    <div class="banner">${voiceStatusHTML()}</div>
    <div class="row"><button class="btn sm gold" data-act="testVoice" data-v="en">${ic('speaker')} ${t('testEn')}</button><button class="btn sm gold" data-act="testVoice" data-v="am">${ic('speaker')} ${t('testAm')}</button></div>
    <div class="sw"><span>${t('sfx')}</span><input type="checkbox" data-set="sfx" ${s.sfx ? 'checked' : ''}></div>
    <div class="sw"><span>${t('autoPauseOpt')}</span><input type="checkbox" data-set="autoPause" ${s.autoPause ? 'checked' : ''}></div>
    <div class="sw"><span>${t('autoSecs')}</span><input class="inp" style="width:90px" type="number" min="3" max="60" value="${s.autoSecs}" data-set="autoSecs"></div></div>
   <div class="panel"><h3>${t('business')}</h3><label>${t('cardPrice')} (${t('etb')}) — ${t('min')} ${MIN_PRICE}</label><input class="inp" type="number" min="${MIN_PRICE}" value="${s.price}" data-set="price">
    <label>${t('commissionPct')}</label><input class="inp" type="number" min="0" max="90" value="${s.commission}" data-set="commission"><p class="muted">${t('priceNote')}</p>
    <label>${t('bizName')}</label><input class="inp" maxlength="40" value="${esc(s.bizName)}" data-set="bizName"><p class="muted">${t('bizNameNote')}</p></div>
   <div class="panel"><h3>${t('security')}</h3><button class="btn ghost" data-act="changePin">${ic('key')} ${s.pinHash ? t('changePin') : t('createPin')}</button></div>
   <div class="panel"><h3>${t('data')}</h3><div class="row"><button class="btn green grow" data-act="backup">${ic('save')} ${t('backupNow')}</button><button class="btn gold grow" data-act="restore">${ic('restore')} ${t('restore')}</button></div>
    <p class="muted">${t('lastBackup')}: ${s.lastBackup ? fmtDT(s.lastBackup) : t('never')} · ${t('storageUsed')}: ${(used / 1024).toFixed(0)} KB</p><input type="file" id="restoreFile" accept=".json,application/json" class="hide"></div>
   <div class="panel"><h3>${t('about')}</h3><p>MAFFIN BINGO v${APP_VERSION} · ${OWNER.biz}</p><button class="btn ghost" data-act="nav" data-to="about">${ic('info')} ${t('about')} / ${t('contactUs')}</button></div></div>`;
}

const tel = n => 'tel:' + n.replace(/\s+/g, '');
function contactBlock() {
  return `<div class="contact">
   ${OWNER.phones.map(p => `<a class="cbtn" href="${tel(p)}"><i>${ic('phone')}</i><span><small>${t('callUs')}</small>${p}</span></a>`).join('')}
   <a class="cbtn" href="https://t.me/${OWNER.tg}" target="_blank" rel="noopener"><i>${ic('telegram')}</i><span><small>Telegram</small>@${OWNER.tg}</span></a>
   <a class="cbtn" href="mailto:${OWNER.email}"><i>${ic('mail')}</i><span><small>${t('emailUs')}</small>${OWNER.email}</span></a>
   <div class="cbtn static"><i>${ic('pin')}</i><span><small>${t('address')}</small>${OWNER.address}</span></div></div>`;
}
function licText() { return LIC.ok ? (LIC.exp ? t('validUntil', String(LIC.exp).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : t('lifetime')) : '-'; }
function aboutView() {
  return topbar(t('about')) + `<div class="wrap"><div class="panel aboutp"><div class="logo">${logoSVG(110)}</div>
   <div class="wordmark"><b>MAFFIN</b><span>BINGO</span></div><p class="muted">v${APP_VERSION}</p></div>
   <div class="panel"><h3>${t('developer')}</h3><div class="sw"><span>${t('business')}</span><b>${OWNER.biz}</b></div><div class="sw"><span>${t('ownerName')}</span><b>${OWNER.name}</b></div></div>
   <div class="panel"><h3>${t('contactUs')}</h3>${contactBlock()}</div>
   <div class="panel"><h3>${t('licenseTitle')}</h3><div class="sw"><span>${t('licensedTo')}</span><b>${esc(LIC.name || '-')}</b></div><div class="sw"><span>${t('validity')}</span><b>${licText()}</b></div><div class="sw"><span>${t('deviceId')}</span><b>${esc(License.deviceId())}</b></div></div>
   <div class="banner">${ic('info')} ${t('licenseNote')}</div></div>`;
}
function contactView() {
  return topbar(t('contactUs')) + `<div class="wrap"><div class="panel"><h3>${OWNER.biz}</h3><p class="muted">${t('contactInfo')}</p>${contactBlock()}</div></div>`;
}
function lockView(msg) {
  const why = LIC.why, dev = LIC.dev || License.deviceId();
  const info = { expired: t('lockExpired'), clock: t('lockClock'), device: t('badDevice'), signature: t('badCode'), format: t('badCode') }[why] || t('lockInfo');
  return `<div class="wrap lock"><div class="hero"><div class="logo">${logoSVG(86)}</div><div class="wordmark"><b>MAFFIN</b><span>BINGO</span></div>
   <div class="tools"><button class="langchip" data-act="lang">${lang() === 'en' ? 'አማርኛ' : 'English'}</button></div></div>
   <div class="panel"><h3>${ic('shield')} ${t('lockTitle')}</h3><p>${msg || info}</p>
    <label>${t('deviceId')}</label><div class="devbox"><b id="devId">${esc(dev)}</b><button class="btn sm gold" data-act="copyDev">${ic('copy')} ${t('copy')}</button></div>
    <p class="muted">${t('lockSteps')}</p>${contactBlock()}</div>
   <div class="panel"><label>${t('activationCode')}</label><textarea id="actCode" class="inp" rows="4" placeholder="${t('pasteCode')}"></textarea>
    <div class="err" id="actErr"></div><button class="btn green xl" data-act="activate" style="margin-top:10px">${ic('unlock')} ${t('activate')}</button></div></div>`;
}

function helpView() {
  const steps = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(k => `<li>${t(k)}</li>`).join('');
  return topbar(t('help')) + `<div class="wrap"><div class="panel"><h3>${t('howTo')}</h3><ol style="padding-left:20px;line-height:1.7">${steps}</ol></div><div class="banner">${ic('info')} ${t('licenseNote')}</div></div>`;
}

/* ---------- render ---------- */
function render() {
  const h = location.hash.replace(/^#\/?/, ''); const p = h.split('/'); const prev = route;
  const inGame = r => r === 'game' || r === 'tv';
  route = p[0] || 'home'; arg = p.slice(1).join('/');
  if (inGame(prev) && !inGame(route)) { stopAuto(); releaseWake(); }
  document.body.classList.toggle('tvmode', route === 'tv' || route === 'tvd');
  document.documentElement.lang = lang(); document.documentElement.dataset.theme = S.settings.theme;
  if (!LIC.ok) { $('#app').innerHTML = lockView(); return; }
  if (route === 'settings' && S.settings.pinHash && Date.now() >= unlockUntil) {
    $('#app').innerHTML = topbar(t('settings'));
    requirePin().then(ok => ok ? render() : go('home')); return;
  }
  let html = '';
  switch (route) {
    case 'new': html = newGameView(); break;
    case 'game': { const g = gameById(arg); if (!g) { html = topbar('?') + `<div class="wrap"><div class="empty">${t('notFound')}</div></div>`; break; } html = g.status === 'upcoming' ? lobbyView(g) : g.status === 'active' ? playView(g) : detailView(g); if (g.status === 'active') keepAwake(); break; }
    case 'cards': html = cardsView(); break;
    case 'players': html = playersView(); break;
    case 'history': html = historyView(); break;
    case 'reports': html = reportView(); break;
    case 'settings': html = settingsView(); break;
    case 'help': html = helpView(); break;
    case 'tv': html = tvView(gameById(arg), false); keepAwake(); break;
    case 'tvd': html = tvView(gameById(arg), true); break;
    case 'about': html = aboutView(); break;
    case 'contact': html = contactView(); break;
    default: route = 'home'; html = homeView();
  }
  $('#app').innerHTML = html; justDrawn = false;
  clearInterval(timerInt);
  if (route === 'game') { const g = gameById(arg); if (g && g.status === 'active') timerInt = setInterval(() => { const el = $('#timer'); if (el) el.textContent = dur(Date.now() - g.startedAt); }, 1000); }
  if (route === 'new') ngCalc();
}
async function keepAwake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request('screen'); wake.onrelease = () => { wake = null; }; } } catch (e) { /* ignore */ } }
function releaseWake() { try { if (wake) wake.release(); } catch (e) { /* */ } wake = null; }
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

/* ---------- game actions ---------- */
function drawNumber(g, manualN) {
  if (g.status !== 'active') return;
  let n = manualN;
  if (!n) { const left = []; for (let i = 1; i <= 75; i++) if (!g.called.includes(i)) left.push(i); if (!left.length) { stopAuto(); toast(t('allCalled'), 'err'); return; } n = left[rnd(left.length)]; }
  const before = new Set(pendingWinners(g).map(x => x.card.id));
  g.called.push(n); save(); justDrawn = true; sfx('draw'); announce(n);
  const fresh = pendingWinners(g).filter(x => !before.has(x.card.id));
  if (fresh.length) {
    setTimeout(() => sfx('win'), 700);
    try { navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) { /* ignore */ }
    toast(t('alertToast', fresh.map(x => pid(x.card.id)).join(', ')), 'ok');
    if (S.settings.autoPause) stopAuto();
  }
  render();
  if (g.called.length >= 75) { stopAuto(); toast(t('allCalled')); render(); }
}
function manualCall(g) {
  const el = $('#manualNo'); const raw = el.value.trim(); const n = Number(raw);
  if (!/^\d+$/.test(raw) || n < 1 || n > 75) { sfx('err'); toast(t('invalidNo'), 'err'); el.focus(); return; }
  if (g.called.includes(n)) { sfx('err'); toast(t('dupNo', letterOf(n) + ' ' + n), 'err'); el.select(); return; }
  drawNumber(g, n);
}
function pendingWinners(g) {
  const called = new Set(g.called), out = [];
  for (const sale of g.sales) for (const id of sale.cardIds) {
    const c = cardMap.get(id); if (!c) continue;
    const lines = winningLines(c.n, called);
    if (lines.length) out.push({ card: c, sale, lines, at: firstWinCall(c.n, g.called) });
  }
  return out.sort((a, b) => a.at - b.at);
}
function checkCard(g, id) {
  const card = cardMap.get(id);
  if (!card) return { state: 'notfound' };
  if (!soldSet(g).has(id)) return { state: 'notsold', card };
  const called = new Set(g.called), lines = winningLines(card.n, called);
  const sale = saleOf(g, id);
  if (!lines.length) return { state: 'invalid', card, sale, called };
  const at = firstWinCall(card.n, g.called);
  return { state: 'valid', card, sale, called, lines, at, late: at < g.called.length, atNo: g.called[at - 1] };
}
const lineName = l => l.type === 'row' ? t('lnRow', l.idx + 1) : l.type === 'col' ? t('lnCol', LETTERS[l.idx]) : l.type === 'diag1' ? t('lnD1') : t('lnD2');
async function verifyDialog(g, pre) {
  let cur = null; const readonly = g.status !== 'active' || !!g.winner;
  const res = await dialog({ title: ic('trophy') + ' ' + t('verifyBingo'), body: `<label>${t('enterCardId')}</label><input id="vid" class="inp" inputmode="numeric" placeholder="42"><div class="vres" id="vres"></div>`,
    onopen: ov => { if (pre) { $('#vid', ov).value = pre; $('.mbtns .btn.gold', ov).click(); } },
    buttons: [{ t: t('close'), v: null }, { t: t('check'), cls: 'gold', collect: ov => {
      const raw = $('#vid', ov).value.replace('#', '').trim(); const id = parseInt(raw, 10);
      const box = $('#vres', ov); cur = null; ov.btns.confirm.classList.add('hide');
      if (!raw || !(id > 0)) { box.innerHTML = `<span class="vbadge no">${t('invalidId')}</span>`; sfx('err'); return false; }
      const r = checkCard(g, id);
      if (r.state === 'notfound') { box.innerHTML = `<span class="vbadge no">${ic('xcircle')} ${t('cardNotFound', pid(id))}</span>`; sfx('err'); return false; }
      if (r.state === 'notsold') { box.innerHTML = `<span class="vbadge no">${ic('xcircle')} ${t('cardNotSold', pid(id))}</span>` + cardHTML(r.card, { called: new Set(g.called) }); sfx('err'); return false; }
      if (r.state === 'invalid') { box.innerHTML = `<span class="vbadge no">${ic('xcircle')} ${t('notWinning')}</span><p class="muted">${esc(r.sale.player)}</p>` + cardHTML(r.card, { called: r.called }); sfx('err'); return false; }
      const win = new Set(); r.lines.forEach(l => l.cells.forEach(i => win.add(i)));
      box.innerHTML = `<span class="vbadge ok">${ic('check')} ${t('validBingo')}</span><p><b>${esc(r.sale.player)}</b> · ${r.lines.map(lineName).join(', ')}</p>${r.late ? `<span class="vbadge warn">${ic('warn')} ${t('lateClaim', r.at, letterOf(r.atNo) + ' ' + r.atNo, g.called.length)}</span>` : ''}` + cardHTML(r.card, { called: r.called, win });
      cur = r; sfx('win'); if (!readonly) ov.btns.confirm.classList.remove('hide');
      return false; } },
      { t: ic('trophy') + ' ' + t('confirmWinner'), cls: 'green', k: 'confirm', hidden: true, collect: () => 'confirm' }] });
  if (res === 'confirm' && cur) {
    const f = gameFinance(g);
    g.winner = { cardId: cur.card.id, player: cur.sale.player, phone: cur.sale.phone || '', patterns: cur.lines.map(lineName), at: Date.now(), prize: f.prize, atCall: cur.at };
    g.status = 'completed'; g.endedAt = Date.now(); save(); stopAuto(); sfx('win');
    await dialog({ title: ic('sparkle') + ' ' + t('winner'), body: `<div class="vbadge ok" style="text-align:center">${esc(g.winner.player)}<br>${t('cardNo')} ${pid(g.winner.cardId)}<br><span style="font-size:28px">${money(f.prize)}</span></div>`, buttons: [{ t: t('ok'), cls: 'green', v: true }] });
    render(); promptBackup();
  }
}
async function promptBackup() {
  if (S.settings.lastBackup && Date.now() - S.settings.lastBackup < 864e5) return;
  if (await confirmBox(ic('save') + ' ' + t('backupNow'), t('backupAsk'), t('backupNow'))) backup();
}

/* sell cards */
async function sellDialog(g) {
  const names = [...new Set(S.games.flatMap(x => x.sales.map(s => s.player)))];
  const r = await dialog({ title: ic('ticket') + ' ' + t('sellCards'), body: `<label>${t('playerName')}</label><input id="sn" class="inp" list="pl" maxlength="40" placeholder="${t('walkIn')}"><datalist id="pl">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
   <label>${t('phoneOpt')}</label><input id="sp" class="inp" inputmode="tel" maxlength="20">
   <label>${t('qty')}</label><input id="sq" class="inp" type="number" min="1" max="200" value="1" inputmode="numeric">
   <label>${t('orIds')}</label><input id="si" class="inp" placeholder="5, 8-12">
   <div class="total" id="stot"></div><div class="err" id="serr"></div>`,
    onopen: ov => { const upd = () => { const ids = $('#si', ov).value.trim(); const q = ids ? parseIds(ids).ids.length : (+$('#sq', ov).value || 0); $('#stot', ov).textContent = t('total') + ': ' + q + ' × ' + num(g.price) + ' = ' + money(q * g.price); }; ov.addEventListener('input', upd); upd(); },
    buttons: [{ t: t('cancel'), v: null }, { t: t('sell'), cls: 'green', collect: ov => {
      const err = m => { $('#serr', ov).textContent = m; sfx('err'); return false; };
      const idsRaw = $('#si', ov).value.trim(); const sold = soldSet(g); let chosen = [];
      if (idsRaw) {
        const p = parseIds(idsRaw); if (p.bad.length) return err(t('badIds', p.bad.join(', '))); if (!p.ids.length) return err(t('invalidId'));
        if (p.ids.length > 200) return err(t('max200'));
        const missing = p.ids.filter(i => !cardMap.has(i)); if (missing.length) return err(t('cardNotFound', missing.slice(0, 5).map(pid).join(', ')));
        const taken = p.ids.filter(i => sold.has(i)); if (taken.length) return err(t('alreadySold', taken.slice(0, 5).map(pid).join(', ')));
        chosen = p.ids;
      } else {
        const q = parseInt($('#sq', ov).value, 10); if (!(q >= 1) || q > 200) return err(t('max200'));
        for (const c of cards) { if (!sold.has(c.id)) { chosen.push(c.id); if (chosen.length === q) break; } }
        if (chosen.length < q) { const extra = generateCards(q - chosen.length); extra.forEach(c => chosen.push(c.id)); }
      }
      g.sales.push({ id: (g.sales.reduce((m, s) => Math.max(m, s.id), 0)) + 1, player: $('#sn', ov).value.trim() || t('walkIn'), phone: $('#sp', ov).value.trim(), cardIds: chosen, at: Date.now() });
      save(); return { chosen }; } }] });
  if (!r) return;
  sfx('click'); render();
  if (await dialog({ title: ic('check') + ' ' + t('sold'), body: `<p>${r.chosen.length} ${t('cardsWord')}: <b>${r.chosen.slice(0, 20).map(pid).join(', ')}${r.chosen.length > 20 ? '…' : ''}</b><br>${money(r.chosen.length * g.price)}</p><p>${t('printNow')}</p>`, buttons: [{ t: t('later'), v: false }, { t: ic('print') + ' ' + t('print'), cls: 'green', v: true }] })) printCards(r.chosen.map(i => cardMap.get(i)), 6);
}

/* print */
function printCards(list, per) {
  if (!list.length) return;
  const colsN = per <= 2 ? 1 : 2;
  let h = '';
  for (let i = 0; i < list.length; i += per) {
    h += `<div class="ppage pp${per}" style="grid-template-columns:repeat(${colsN},minmax(0,1fr));grid-template-rows:repeat(${Math.ceil(per / colsN)},minmax(0,1fr))">`;
    list.slice(i, i + per).forEach(c => {
      h += `<div class="pc"><div class="pc-h">${crownBW}<span>MAFFIN BINGO</span><em>No. ${pid(c.id)}</em></div><table><tr>${LETTERS.map(l => `<th>${l}</th>`).join('')}</tr>`;
      for (let r = 0; r < 5; r++) { h += '<tr>'; for (let k = 0; k < 5; k++) { const idx = r * 5 + k; h += idx === 12 ? `<td class="free">FREE<br>ነጻ</td>` : `<td>${c.n[idx]}</td>`; } h += '</tr>'; }
      const biz = S.settings.bizName || LIC.name || '';
      h += `</table><div class="pc-f">${biz ? esc(biz) + ' · ' : ''}Card ${pid(c.id)} · MAFFIN BINGO by ${OWNER.biz}</div></div>`;
    });
    h += '</div>';
  }
  doPrint(h);
}
function doPrint(html) { $('#printArea').innerHTML = html; setTimeout(() => window.print(), 150); }
window.addEventListener('afterprint', () => { const p = $('#printArea'); if (p) p.innerHTML = ''; });
async function printDialog() {
  const gopts = S.games.slice().reverse().map(g => `<option value="${g.id}">${esc(g.id)}</option>`).join('');
  const r = await dialog({ title: ic('print') + ' ' + t('printCards'), body: `<label>${t('whichCards')}</label><select id="pw" class="inp"><option value="range">${t('pRange')}</option><option value="unsold">${t('pUnsold')}</option><option value="sold">${t('pSold')}</option></select>
   <div id="pgrow"><label>${t('game')}</label><select id="pg" class="inp">${gopts || '<option value="">-</option>'}</select></div>
   <div class="row"><div class="grow"><label>${t('from')} #</label><input id="pf" class="inp" type="number" value="1" min="1"></div><div class="grow"><label>${t('to')} #</label><input id="pt" class="inp" type="number" value="${Math.min(cards.length, 12)}" min="1"></div></div>
   <label>${t('perPage')}</label><select id="pp" class="inp"><option>2</option><option>4</option><option selected>6</option><option>8</option></select><div class="err" id="perr"></div>`,
    buttons: [{ t: t('cancel'), v: null }, { t: ic('print') + ' ' + t('print'), cls: 'green', collect: ov => {
      const w = $('#pw', ov).value, per = +$('#pp', ov).value; let list = [];
      if (w === 'range') { const a = +$('#pf', ov).value, b = +$('#pt', ov).value; list = cards.filter(c => c.id >= a && c.id <= b); }
      else { const g = gameById($('#pg', ov).value); if (!g) { $('#perr', ov).textContent = t('pickGame'); return false; } const s = soldSet(g); list = cards.filter(c => (w === 'sold') === s.has(c.id)); }
      if (!list.length) { $('#perr', ov).textContent = t('noCards'); return false; }
      if (list.length > 400) { $('#perr', ov).textContent = t('max400'); return false; }
      return { list, per }; } }] });
  if (r) printCards(r.list, r.per);
}
function printReport() {
  const R = reportData(), T = R.tot, [a, b] = repRange();
  const h = `<div class="prep"><h1>MAFFIN BINGO — ${t('reports')}</h1><p>${a ? fmtD(a) : '—'} → ${fmtD(Math.min(b, Date.now()))} · ${fmtDT(Date.now())}</p>
   <table><tr><th>${t('date')}</th><th>${t('gamesWord')}</th><th>${t('cardsWord')}</th><th>${t('totalRevenue')}</th><th>${t('commission')}</th><th>${t('prizesPaid')}</th></tr>
   ${R.days.map(d => `<tr><td>${d.day}</td><td>${d.games}</td><td>${d.cards}</td><td>${num(d.revenue)}</td><td>${num(d.commission)}</td><td>${num(d.paid)}</td></tr>`).join('')}
   <tr><th>${t('total')}</th><th>${T.games}</th><th>${T.cards}</th><th>${num(T.revenue)}</th><th>${num(T.commission)}</th><th>${num(T.paid)}</th></tr></table>
   <table><tr><th>ID</th><th>${t('status')}</th><th>${t('cardsWord')}</th><th>${t('totalRevenue')}</th><th>${t('prizePool')}</th><th>${t('winner')}</th></tr>
   ${R.gs.map(g => { const f = gameFinance(g); return `<tr><td>${esc(g.id)}</td><td>${t('st_' + g.status)}</td><td>${f.sold}</td><td>${num(f.revenue)}</td><td>${num(f.prize)}</td><td>${g.winner ? esc(g.winner.player) + ' #' + pid(g.winner.cardId) : '-'}</td></tr>`; }).join('')}</table>
   <p>${t('unclaimedPools')}: ${money(T.unclaimed)} · ${t('cancelledGames')}: ${T.cancelled}</p></div>`;
  doPrint(h);
}

/* backup / restore / export */
async function download(name, text, mime) {
  const cap = window.Capacitor; // inside the Android APK: save to cache, then open the share sheet
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Filesystem && cap.Plugins.Share) {
    try {
      const r = await cap.Plugins.Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await cap.Plugins.Share.share({ title: name, url: r.uri }); return;
    } catch (e) { /* fall through to browser method */ }
  }
  const bl = new Blob([text], { type: mime }), a = document.createElement('a');
  a.href = URL.createObjectURL(bl); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
const stamp = () => { const d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()); };
function backup() {
  download(`maffin-backup-${stamp()}.json`, JSON.stringify({ app: 'MAFFIN BINGO', v: 1, exportedAt: Date.now(), data: S, cards }), 'application/json');
  S.settings.lastBackup = Date.now(); save(); toast(t('backupDone'), 'ok'); if (route === 'home' || route === 'settings') render();
}
async function restoreFrom(file) {
  let o; try { o = JSON.parse(await file.text()); } catch (e) { toast(t('badBackup'), 'err'); return; }
  const ok = o && o.app === 'MAFFIN BINGO' && o.v === 1 && o.data && Array.isArray(o.data.games) && Array.isArray(o.cards) && o.cards.every(c => c && Number.isInteger(c.id) && Array.isArray(c.n) && c.n.length === 25);
  if (!ok) { toast(t('badBackup'), 'err'); return; }
  if (!(await requirePin())) return;
  if (!(await confirmBox(ic('restore') + ' ' + t('restore'), t('restoreWarn', o.data.games.length, o.cards.length, fmtDT(o.exportedAt)), t('restore'), true))) return;
  S = o.data; S.settings = Object.assign(defaultState().settings, S.settings); cards = o.cards; cardMap = new Map(cards.map(c => [c.id, c]));
  save(); saveCards(); toast(t('restored'), 'ok'); go('home'); render();
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, d = b.dataset, g = (route === 'game' || route === 'tv') ? gameById(arg) : null;
  switch (a) {
    case 'nav': go(d.to); break;
    case 'lang': S.settings.lang = lang() === 'en' ? 'am' : 'en'; save(); render(); break;
    case 'setLang': S.settings.lang = d.v; save(); render(); break;
    case 'activeGame': { const ag = activeGame(); if (ag) go('game/' + ag.id); else { const up = S.games.filter(x => x.status === 'upcoming').pop(); if (up) go('game/' + up.id); else toast(t('noneActive')); } break; }
    case 'ngUnlock': if (await requirePin()) { $('#ngPrice').disabled = false; $('#ngComm').disabled = false; $('#ngPrice').focus(); } break;
    case 'ngCreate': {
      const p = +$('#ngPrice').value, c = +$('#ngComm').value;
      if (!(p >= MIN_PRICE)) { toast(t('minPriceErr', MIN_PRICE), 'err'); sfx('err'); break; }
      if (!(c >= 0 && c <= 90)) { toast(t('commErr'), 'err'); sfx('err'); break; }
      if (p !== S.settings.price || c !== S.settings.commission) { S.settings.price = p; S.settings.commission = c; }
      const ng = newGame(p, c); sfx('click'); go('game/' + ng.id); break; }
    case 'sell': if (g) sellDialog(g); break;
    case 'voidSale': if (g && await requirePin() && await confirmBox(t('voidSale'), t('voidAsk'), t('voidSale'), true)) { g.sales = g.sales.filter(s => s.id !== +d.sale); save(); render(); } break;
    case 'printSale': { const s = g.sales.find(x => x.id === +d.sale); if (s) printCards(s.cardIds.map(i => cardMap.get(i)), 6); break; }
    case 'printGame': if (g) printCards([...soldSet(g)].sort((x, y) => x - y).map(i => cardMap.get(i)), 6); break;
    case 'startGame': {
      if (activeGame()) { toast(t('anotherActive'), 'err'); break; }
      if (await confirmBox(t('startGame'), t('startAsk', g.sales.reduce((n, s) => n + s.cardIds.length, 0)), t('startGame'))) { g.status = 'active'; g.startedAt = Date.now(); save(); sfx('win'); render(); }
      break; }
    case 'draw': if (g) drawNumber(g); break;
    case 'manual': if (g) manualCall(g); break;
    case 'auto': if (g) { if (autoTimer) { stopAuto(); render(); } else { drawNumber(g); autoTimer = setInterval(() => { const x = gameById(arg); if (!x || x.status !== 'active') return stopAuto(); drawNumber(x); }, S.settings.autoSecs * 1000); render(); } } break;
    case 'tvWin': { const w = window.open(location.href.split('#')[0] + '#/tvd/' + arg, 'maffintv', 'popup=yes,width=1280,height=720'); if (!w) toast(t('popupBlocked'), 'err'); break; }
    case 'repeat': { const n = g && g.called[g.called.length - 1]; if (n) announce(n, true); else toast(t('nothingYet')); break; }
    case 'announceAny': {
      const r = await dialog({ title: ic('speaker') + ' ' + t('announceOnly'), body: `<p class="muted">${t('announceInfo')}</p><input id="an" class="inp" type="number" min="1" max="75" inputmode="numeric">`, buttons: [{ t: t('cancel'), v: null }, { t: t('say'), cls: 'green', collect: ov => { const n = +$('#an', ov).value; if (!(n >= 1 && n <= 75)) return false; return n; } }] });
      if (r) announce(r, true); break; }
    case 'voiceToggle': S.settings.voiceOn = !S.settings.voiceOn; save(); render(); break;
    case 'fs': if (!document.fullscreenElement) { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen || (() => Promise.reject())).call(el).catch(() => toast(t('fsFail'), 'err')); } else document.exitFullscreen(); break;
    case 'verify': if (g) verifyDialog(g); break;
    case 'verifyCard': if (g) verifyDialog(g, d.id); break;
    case 'endGame': if (g && await confirmBox(t('endNoWinner'), t('endAsk'), t('endNoWinner'), true)) { g.status = 'completed'; g.endedAt = Date.now(); save(); stopAuto(); render(); promptBackup(); } break;
    case 'resetDraw': if (g && await requirePin() && await confirmBox(t('resetDraw'), t('resetAsk'), t('resetDraw'), true)) { g.resets.push({ at: Date.now(), calledCount: g.called.length, called: g.called.slice() }); g.called = []; g.startedAt = Date.now(); stopAuto(); save(); render(); } break;
    case 'cancelGame': {
      if (!g || !(await requirePin())) break;
      const r = await dialog({ title: t('cancelGame'), body: `<p>${t('cancelAsk')}</p><label>${t('reason')}</label><input id="cr" class="inp" maxlength="80">`, buttons: [{ t: t('no'), v: null }, { t: t('cancelGame'), cls: 'red', collect: ov => ({ reason: $('#cr', ov).value.trim() }) }] });
      if (r) { g.status = 'cancelled'; g.endedAt = Date.now(); g.cancelReason = r.reason; stopAuto(); save(); go('history'); } break; }
    case 'viewCard': {
      const c = cardMap.get(+d.id); if (!c) break;
      const gg = (route === 'game' && g) ? g : (cardsFilter.game ? gameById(cardsFilter.game) : null);
      const called = gg ? new Set(gg.called) : new Set(); const sale = gg ? saleOf(gg, c.id) : null;
      const r = await dialog({ title: `${t('cardNo')} ${pid(c.id)}`, body: `<div style="text-align:center">${cardHTML(c, { called })}</div>${sale ? `<p>${t('owner')}: <b>${esc(sale.player)}</b></p>` : ''}`, buttons: [{ t: t('close'), v: null }, { t: ic('print') + ' ' + t('print'), cls: 'green', v: 'print' }] });
      if (r === 'print') printCards([c], 1); break; }
    case 'gen': { const q = parseInt($('#genQty').value, 10); if (!(q >= 1 && q <= 500)) { toast(t('max500'), 'err'); break; } const m = generateCards(q); toast(t('generated', m.length, pid(m[0].id), pid(m[m.length - 1].id)), 'ok'); cardsFilter.q = ''; render(); break; }
    case 'moreCards': cardsFilter.limit += 200; render(); break;
    case 'printDialog': printDialog(); break;
    case 'player': {
      const nm = d.name.toLowerCase(); let h = '';
      S.games.forEach(x => x.sales.filter(s => s.player.toLowerCase() === nm).forEach(s => { h += `<div class="item"><div class="l1"><span>${esc(x.id)}</span>${statusChip(x.status)}</div><div class="ids">${s.cardIds.map(i => `<span class="idc sold">${pid(i)}</span>`).join('')}</div></div>`; }));
      dialog({ title: esc(d.name), body: h, buttons: [{ t: t('close'), cls: 'green', v: true }] }); break; }
    case 'exportCsv': download(`maffin-report-${stamp()}.csv`, reportCSV(), 'text/csv;charset=utf-8'); toast(t('exported'), 'ok'); break;
    case 'printReport': printReport(); break;
    case 'testVoice': { await probeVoices(); const wantAm = d.v === 'am'; if (wantAm && !amReady()) toast(t('noAmVoice'), 'err'); const l = wantAm && amReady() ? 'am' : 'en'; await speak(callText(37, l), l); if (route === 'settings') render(); break; }
    case 'changePin': if (await requirePin()) { await choosePin(false); render(); } break;
    case 'backup': backup(); break;
    case 'copyDev': { const v = License.deviceId(); try { await navigator.clipboard.writeText(v); toast(t('copied'), 'ok'); } catch (e) { toast(v); } break; }
    case 'activate': {
      const code = $('#actCode').value.trim(); if (!code) { $('#actErr').textContent = t('badCode'); break; }
      const r = await License.activate(code);
      if (!r.ok) { LIC = Object.assign({}, LIC, { ok: false }); $('#actErr').textContent = { expired: t('lockExpired'), device: t('badDevice') }[r.why] || t('badCode'); sfx('err'); break; }
      LIC = r; sfx('win'); toast(t('activated'), 'ok'); render(); await firstRun(); break; }
    case 'restore': $('#restoreFile').click(); break;
  }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'restoreFile' && el.files[0]) { restoreFrom(el.files[0]); el.value = ''; return; }
  if (el.dataset.set) {
    const k = el.dataset.set; let v = el.type === 'checkbox' ? el.checked : el.value;
    if (['volume', 'rate'].includes(k)) v = +v;
    if (k === 'autoSecs') { v = Math.max(3, Math.min(60, Math.round(+v || 8))); stopAuto(); }
    if (k === 'price') { v = +v; if (!(v >= MIN_PRICE)) { toast(t('minPriceErr', MIN_PRICE), 'err'); sfx('err'); render(); return; } }
    if (k === 'commission') { v = +v; if (!(v >= 0 && v <= 90)) { toast(t('commErr'), 'err'); sfx('err'); render(); return; } }
    S.settings[k] = v; save();
    if (k === 'theme') document.documentElement.dataset.theme = v;
    if (k === 'voiceLang') amWarned = false;
    if (!['voiceOn', 'sfx'].includes(k)) render();
    return;
  }
  if (el.id === 'cardGame') { cardsFilter.game = el.value; cardsFilter.state = 'all'; render(); }
  if (el.id === 'cardState') { cardsFilter.state = el.value; render(); }
  if (el.id === 'hst') { histF.st = el.value; render(); }
  if (el.id === 'hfrom') { histF.from = el.value; render(); }
  if (el.id === 'hto') { histF.to = el.value; render(); }
  if (el.id === 'repRange') { repF.range = el.value; render(); }
  if (el.id === 'rfrom') { repF.from = el.value; render(); }
  if (el.id === 'rto') { repF.to = el.value; render(); }
});
document.addEventListener('input', e => {
  const el = e.target;
  const keepFocus = fn => { fn(); render(); const n = document.getElementById(el.id); if (n) { n.focus(); n.setSelectionRange && n.setSelectionRange(n.value.length, n.value.length); } };
  if (el.id === 'cardQ') keepFocus(() => { cardsFilter.q = el.value; cardsFilter.limit = 120; });
  if (el.id === 'playerQ') keepFocus(() => { playerQ = el.value; });
  if (el.id === 'hq') keepFocus(() => { histF.q = el.value; });
  if (el.id === 'ngPrice' || el.id === 'ngComm') ngCalc();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'manualNo') { const g = gameById(arg); if (g) manualCall(g); }
  if (route === 'tv' && (e.key === ' ' || e.key === 'Enter') && !/INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)) { e.preventDefault(); const g = gameById(arg); if (g) drawNumber(g); }
});
window.addEventListener('storage', e => {
  if (!displayOnly || (e.key !== K_MAIN && e.key !== K_CARDS)) return;
  const g0 = gameById(arg), n0 = g0 ? g0.called.length : 0; load();
  const g1 = gameById(arg); justDrawn = !!g1 && g1.called.length > n0; render();
});
document.addEventListener('fullscreenchange', () => document.body.classList.toggle('fs', !!document.fullscreenElement));
window.addEventListener('hashchange', render);
window.addEventListener('pagehide', () => { try { save(); } catch (e) { /* */ } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (route === 'game') keepAwake(); recheckLicense(); } });

/* ---------- boot ---------- */
async function firstRun() { if (!S.settings.pinHash) { await choosePin(true); render(); } }
async function recheckLicense() { const st = await License.status(); const was = LIC.ok; LIC = st; if (was && !st.ok) render(); }
async function boot() {
  displayOnly = /^#\/tvd\//.test(location.hash);
  load();
  document.documentElement.dataset.theme = S.settings.theme;
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* */ }
  if (!location.hash) history.replaceState(null, '', '#/home');
  LIC = await License.status();
  render(); probeVoices();
  if (LIC.ok && !displayOnly) await firstRun();
  setInterval(recheckLicense, 600000);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache optional */ });
}
window.MaffinDebug = { get S() { return S; }, get cards() { return cards; }, lock() { unlockUntil = 0; } };
boot();
})();
