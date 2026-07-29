/* ==========================================================================
   發音播放

   音檔是事先用 macOS 的 say 產生的（見 make_audio.py），不是瀏覽器即時合成。
   原因：使用者主要從主畫面圖示開啟（iOS standalone），那個模式下的語音／
   音訊 API 長期不穩，而預先產生的檔案品質固定、離線可靠、每台裝置一致。

   慢速跟讀直接用 <audio> 的 playbackRate，不需要另外一份慢速音檔。
   ========================================================================== */

const AUDIO_DIR = 'audio/';
const AUDIO_CACHE = 'jp-audio-v1';   // 與 sw.js 同名，兩邊共用同一份快取

let _audioEl = null;
function audioEl() {
  if (!_audioEl) {
    _audioEl = new Audio();
    _audioEl.preload = 'none';
    // 變速時維持音高，慢速跟讀才不會變成怪腔調
    _audioEl.preservesPitch = true;
    _audioEl.webkitPreservesPitch = true;
  }
  return _audioEl;
}

function audioAvailable() {
  return typeof AUDIO_INDEX !== 'undefined' && !!AUDIO_INDEX;
}

/* 查得到就回傳路徑，查不到回 null —— 呼叫端據此決定要不要顯示喇叭按鈕，
   避免出現按了沒反應的按鈕 */
function audioSrc(text, kind) {
  if (!audioAvailable() || !text) return null;
  const map = AUDIO_INDEX[kind === 'npc' ? 'npc' : 'main'];
  const file = map && map[text];
  return file ? AUDIO_DIR + file : null;
}

function playAudio(text, kind, slow) {
  const src = audioSrc(text, kind);
  if (!src) return;
  const a = audioEl();
  try {
    a.pause();
    a.src = src;                 // 重設 src 等於從頭播，連按同一顆＝重播
    a.playbackRate = slow ? (S.settings.slowRate || 0.75) : 1;
    const p = a.play();
    if (p && p.catch) p.catch(() => toast('播不出來？檢查一下手機側邊的靜音開關 🔇'));
  } catch (e) {
    toast('播不出來？檢查一下手機側邊的靜音開關 🔇');
  }
}

/* 🔊 正常速度 ／ 🐢 慢速。沒有音檔就回空字串。 */
function speakButtons(text, kind) {
  if (!audioSrc(text, kind)) return '';
  const k = kind === 'npc' ? 'npc' : 'main';
  const t = esc(text);
  return `<div class="speak">
    <button class="spk" data-act="speak" data-t="${t}" data-k="${k}" aria-label="播放發音">🔊</button>
    <button class="spk" data-act="speak" data-t="${t}" data-k="${k}" data-slow="1" aria-label="慢速播放">🐢</button>
  </div>`;
}

/* ---------------------------- 語音包 ---------------------------- */
function audioFileList() {
  if (!audioAvailable()) return [];
  const set = {};
  ['main', 'npc'].forEach(k => {
    Object.keys(AUDIO_INDEX[k] || {}).forEach(t => { set[AUDIO_DIR + AUDIO_INDEX[k][t]] = 1; });
  });
  return Object.keys(set);
}

/* 直接寫 Cache API，不倚賴 service worker 有沒有啟動 —— sw.js 讀的是同一份快取 */
async function downloadVoicePack(onProgress) {
  const files = audioFileList();
  if (!files.length || !('caches' in window)) throw new Error('這個瀏覽器不支援離線快取');
  const cache = await caches.open(AUDIO_CACHE);
  let done = 0, failed = 0;
  const CONCURRENCY = 6;

  async function worker(queue) {
    while (queue.length) {
      const url = queue.pop();
      try {
        if (!(await cache.match(url))) await cache.add(url);
      } catch (e) { failed++; }
      done++;
      if (onProgress) onProgress(done, files.length, failed);
    }
  }
  const queue = files.slice();
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
  return { total: files.length, failed: failed };
}

/* 回報已經存在快取裡的數量，讓設定頁能顯示真實狀態而不是只信旗標 */
async function voicePackCached() {
  if (!('caches' in window)) return 0;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    return (await cache.keys()).length;
  } catch (e) { return 0; }
}
