/* Service worker：讓「加到主畫面」的版本在沒有網路時也能開。
   人在東京、地下街沒訊號的時候，這支檔案就是 App 還能不能用的差別。 */

const CACHE = 'jp-sprint-v4';
/* 音檔放獨立快取：之後 bump CACHE 改版時，不會把使用者下載好的語音包洗掉 */
const AUDIO_CACHE = 'jp-audio-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './data.js',
  './audio-index.js',
  './audio.js',
  './sync.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 同步用的 Supabase 請求一律走網路，不進快取
  if (url.origin !== location.origin) return;

  // 音檔：純 cache-first 存進獨立快取，不做背景更新（內容不會變，省流量）
  if (url.pathname.indexOf('/audio/') >= 0) {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(c =>
        c.match(req).then(hit => hit || fetch(req).then(res => {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // cache-first ＋ 背景更新：離線可用，有網路時下次開啟就是新版
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
