/* ==========================================================================
   跨裝置同步（同步碼，無帳號）

   設計前提：localStorage 永遠是唯一的真實來源，雲端只是同步層。
   沒網路、沒設定同步碼時，App 的行為跟完全沒有這個檔案一模一樣 ——
   人在東京、地下街收不到訊號的時候，學習流程一秒都不能被擋住。
   ========================================================================== */

/* 去掉容易看錯的 0 O 1 I l */
const SYNC_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SYNC_CODE_LEN = 12;

function syncConfigured() {
  return typeof SUPABASE_URL === 'string' && SUPABASE_URL.length > 0
      && typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 0;
}
function syncEnabled() {
  return syncConfigured() && S.sync && S.sync.code;
}

function newSyncCode() {
  const bytes = new Uint8Array(SYNC_CODE_LEN);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += SYNC_ALPHABET[bytes[i] % SYNC_ALPHABET.length];
  return out;
}
function prettyCode(code) {
  return code ? code.replace(/(.{4})(?=.)/g, '$1-') : '';
}
function normalizeCode(s) {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function rpc(fn, body) {
  const res = await fetch(SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('伺服器回應 ' + res.status);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* --------------------------------------------------------------------------
   合併：兩台裝置各練各的也不能弄丟任何一邊的紀錄
   -------------------------------------------------------------------------- */
function mergeState(local, remote) {
  if (!remote || typeof remote !== 'object' || !remote.cards) return local;
  const out = JSON.parse(JSON.stringify(local));

  // 卡片：逐張取「最近複習過」的那份；盤點結果只要有一邊做過就算數
  Object.keys(remote.cards).forEach(id => {
    const r = remote.cards[id];
    const l = out.cards[id];
    if (!l) { out.cards[id] = r; return; }
    if ((r.lastReviewed || 0) > (l.lastReviewed || 0)) out.cards[id] = r;
    const merged = out.cards[id];
    if ((r.triaged || l.triaged) && !merged.triaged) {
      merged.triaged = true;
      merged.seed = merged.seed || r.seed || l.seed || null;
    }
  });

  // 每日紀錄：以日期聯集，同一天以本機為準
  Object.keys(remote.days || {}).forEach(k => { if (!out.days[k]) out.days[k] = remote.days[k]; });

  // streak：採用 lastDay 較晚的那份，best 取大、補簽卡取小（保守）
  const rs = remote.streak, ls = out.streak;
  if (rs) {
    const takeRemote = rs.lastDay && (!ls.lastDay || rs.lastDay > ls.lastDay);
    out.streak = Object.assign({}, takeRemote ? rs : ls);
    out.streak.best = Math.max(ls.best || 0, rs.best || 0);
    out.streak.freezes = Math.min(
      typeof ls.freezes === 'number' ? ls.freezes : 2,
      typeof rs.freezes === 'number' ? rs.freezes : 2
    );
  }

  // 反思：以日期去重聯集
  const seenDay = {};
  out.reflections.forEach(r => { seenDay[r.day] = true; });
  (remote.reflections || []).forEach(r => {
    if (!seenDay[r.day]) { out.reflections.push(r); seenDay[r.day] = true; }
  });
  out.reflections.sort((a, b) => (a.day < b.day ? -1 : 1));

  // 一日東京通關紀錄：以日期＋分數去重
  const runs = {};
  (out.tokyo.runs || []).concat(((remote.tokyo || {}).runs) || [])
    .forEach(r => { runs[r.day + '|' + JSON.stringify(r.scores)] = r; });
  out.tokyo.runs = Object.keys(runs).map(k => runs[k]);

  // 盤點統計直接從卡片重算，避免兩邊相加變成重複計數
  const t = { known: 0, quick: 0, cold: 0 };
  Object.keys(out.cards).forEach(id => {
    const st = out.cards[id];
    if (!st.triaged) return;
    if (st.status === 'known') t.known++;
    else if (st.seed === 'quick') t.quick++;
    else if (st.seed === 'cold') t.cold++;
  });
  out.triage = t;

  // 課表進度以最早開始的那台為準
  if (remote.startDay && remote.startDay < out.startDay) out.startDay = remote.startDay;

  // out.sync 維持本機的（同步碼本身不從遠端覆蓋）
  return out;
}

/* --------------------------------------------------------------------------
   拉取 / 推送
   -------------------------------------------------------------------------- */
async function syncPull(codeOverride) {
  if (!syncConfigured()) throw new Error('尚未設定雲端同步');
  const code = normalizeCode(codeOverride || (S.sync && S.sync.code));
  if (!code) throw new Error('沒有同步碼');
  const remote = await rpc('pull', { p_code: code });
  if (remote) S = mergeState(S, remote);
  S.sync = S.sync || {};
  S.sync.code = code;
  S.sync.lastPull = Date.now();
  save();
  return !!remote;
}

async function syncPush() {
  if (!syncEnabled()) return false;
  await rpc('push', { p_code: S.sync.code, p_data: S });
  S.sync.lastPush = Date.now();
  save();
  return true;
}

/* 開啟 App 時拉一次；失敗完全靜音，不干擾學習 */
function syncOnOpen() {
  if (!syncEnabled()) return;
  syncPull().then(() => render()).catch(() => {});
}

/* 完成當日課程之後推一次，稍微延遲避免連續存檔一直打 */
let syncTimer = null;
function syncSoon() {
  if (!syncEnabled()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncPush().catch(() => {}); }, 1500);
}

/* 切到背景時（關 App、切換分頁）補推一次 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') syncPush().catch(() => {});
});

function agoText(ts) {
  if (!ts) return '尚未同步';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return '剛剛';
  if (m < 60) return m + ' 分鐘前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' 小時前';
  return Math.floor(h / 24) + ' 天前';
}
