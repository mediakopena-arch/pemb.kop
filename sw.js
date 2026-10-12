/* KoperasiKu Service Worker - cache app shell agar bisa offline & dapat di-Instal */
const CACHE = 'koperasiku-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Jangan sentuh permintaan ke server sinkron / lintas domain - biarkan lewat
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // HTML selalu coba jaringan dulu (update cepat), fallback ke cache saat offline
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      // Hanya simpan jika respons sukses, supaya halaman error tidak menimpa index.html di cache
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Asset lain: cache dulu, update di belakang
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
