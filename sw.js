/* Offline cache: after the first load every file works with no internet. */
const V = 'maffin-v1.1.0';
const FILES = ['./', 'index.html', 'css/style.css', 'js/i18n.js', 'js/icons.js', 'js/core.js', 'js/license.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'fonts/Outfit-Regular.ttf', 'fonts/Outfit-Bold.ttf', 'fonts/EricaOne-Regular.ttf', 'fonts/am-400.woff2', 'fonts/am-700.woff2', 'fonts/am-900.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
