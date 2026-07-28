/* ==========================================================================
   東京旅遊日語 30 天衝刺 — 應用邏輯
   ========================================================================== */

/* ---------------------------- 小工具 ---------------------------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const DAY_MS = 86400000;

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function monthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
function parseKey(k) { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function endOfToday() { return startOfToday() + DAY_MS - 1; }
function daysBetween(aKey, bKey) { return Math.round((parseKey(bKey) - parseKey(aKey)) / DAY_MS); }
function daysLeft() { return Math.max(0, Math.ceil((TRIP_DATE - startOfToday()) / DAY_MS)); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(a, n) { return shuffle(a).slice(0, n); }

/* ---------------------------- 狀態 ---------------------------- */
const STORE_KEY = 'jp-sprint-tokyo-v1';

function defaultState() {
  return {
    version: 1,
    createdAt: Date.now(),
    startDay: dayKey(),
    cards: {},
    diag: { done: false, cursor: 0, sessions: 0, lastDay: null, order: null, known: 0, rusty: 0 },
    streak: { count: 0, best: 0, lastDay: null, freezes: 2, freezeMonth: monthKey(), frozen: [] },
    days: {},
    tokyo: { runs: [] },
    settings: { newPerDay: 8, romaji: true },
    reflections: []
  };
}

let S = defaultState();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      S = Object.assign(defaultState(), parsed);
      S.streak = Object.assign(defaultState().streak, parsed.streak || {});
      S.diag = Object.assign(defaultState().diag, parsed.diag || {});
      S.settings = Object.assign(defaultState().settings, parsed.settings || {});
      S.tokyo = Object.assign(defaultState().tokyo, parsed.tokyo || {});
    }
  } catch (e) { console.warn('讀取進度失敗，改用全新狀態', e); }
  return S;
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
  catch (e) { toast('⚠️ 儲存失敗，瀏覽器空間可能已滿'); }
}

function cs(id) {
  if (!S.cards[id]) S.cards[id] = { interval: 0, repetitions: 0, easeFactor: 2.5, dueDate: null, status: 'new', lastReviewed: null, lapses: 0 };
  return S.cards[id];
}
function dayRec(k) {
  if (!S.days[k]) S.days[k] = { stages: {}, done: false, reviewed: 0, introduced: 0, kanjiRight: 0, kanjiTotal: 0, reflection: '', dialogId: null };
  return S.days[k];
}

/* ---------------------------- SRS 排程引擎 ---------------------------- */
/* 依規格書實作：簡化 SM-2 ＋ 衝刺上限 */
function schedule(card, quality) {
  if (quality < 3) {
    card.repetitions = 0;
    card.interval = 1;                       // 忘記 → 明天再見
    card.lapses = (card.lapses || 0) + 1;
  } else {
    if (card.repetitions === 0) card.interval = 1;
    else if (card.repetitions === 1) card.interval = 3;   // 衝刺版：壓縮原 SM-2 的 6 天
    else card.interval = Math.round(card.interval * card.easeFactor);
    card.repetitions += 1;
  }
  card.easeFactor = Math.max(1.3,
    card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  // 衝刺上限：間隔不超過「距出發剩餘天數的一半」
  const dLeft = Math.ceil((TRIP_DATE - Date.now()) / 86400000);
  card.interval = Math.min(card.interval, Math.max(1, Math.floor(dLeft / 2)));
  card.dueDate = Date.now() + card.interval * 86400000;
  card.status = 'learning';
  card.lastReviewed = Date.now();
  return card;
}

function dueCardIds() {
  const end = endOfToday();
  return CARDS.filter(c => {
    const st = S.cards[c.id];
    return st && st.status === 'learning' && st.dueDate != null && st.dueDate <= end;
  }).map(c => c.id);
}

/* ---------------------------- 30 天課表 ---------------------------- */
const ALL_POOLS = ['basics', 'repair', 'restaurant', 'shopping', 'transport', 'hotel', 'kanji'];
const PHASES = [
  { key: 'diag', name: '診斷重啟', from: 1, to: 3, pools: [], desc: '全卡診斷分流' },
  { key: 'A', name: '區塊 A', from: 4, to: 9, pools: ['basics', 'repair', 'restaurant'], desc: '問候／數字／時間 ＋ 餐廳' },
  { key: 'B', name: '區塊 B', from: 10, to: 15, pools: ['shopping', 'transport'], desc: '購物 ＋ 交通問路' },
  { key: 'C', name: '區塊 C', from: 16, to: 21, pools: ['hotel', 'kanji'], desc: '飯店 ＋ 招牌漢字閱讀' },
  { key: 'MIX', name: '交錯模擬', from: 22, to: 27, pools: ALL_POOLS, desc: '「一日東京」串場模擬' },
  { key: 'FINE', name: '高頻精煉', from: 28, to: 30, pools: ALL_POOLS, starOnly: true, desc: '只練高頻句 ＋ 修復策略' }
];

/* 依「已過天數 / 到出發的總跨度」等比對映到 30 天課表 */
function virtualDay() {
  const total = Math.max(1, Math.round((parseKey(dayKey(new Date(TRIP_DATE))) - parseKey(S.startDay)) / DAY_MS));
  const elapsed = Math.max(0, daysBetween(S.startDay, dayKey()));
  const p = Math.min(1, elapsed / total);
  return Math.min(30, Math.max(1, Math.floor(p * 29) + 1));
}
/* 診斷做完就進正課，就算日曆上還在 Day 1–3 也一樣 */
function curriculumDay() {
  const d = virtualDay();
  return S.diag.done ? Math.max(4, d) : d;
}
function currentPhase() {
  if (!S.diag.done) return PHASES[0];
  const d = curriculumDay();
  return PHASES.find(p => d >= p.from && d <= p.to) || PHASES[PHASES.length - 1];
}
function tokyoUnlocked() {
  return S.diag.done && (curriculumDay() >= 22 || daysLeft() <= 6);
}

/* ---------------------------- 掌握度 ---------------------------- */
function cardLevel(c) {
  const st = S.cards[c.id];
  if (!st) return 'new';
  if (st.status === 'known') return 'strong';
  if (st.repetitions >= 2 && st.interval >= 3) return 'strong';
  if (st.status === 'learning' || st.diagRusty) return 'weak';
  return 'new';
}
function groupStats(group) {
  const cards = CARDS.filter(c => group.members.indexOf(c.scenario) >= 0);
  const r = { strong: 0, weak: 0, new: 0, total: cards.length };
  cards.forEach(c => r[cardLevel(c)]++);
  return r;
}

/* ---------------------------- streak ---------------------------- */
function refreshFreezeMonth() {
  if (S.streak.freezeMonth !== monthKey()) {
    S.streak.freezeMonth = monthKey();
    S.streak.freezes = 2;
    save();
  }
}
function streakGap() {
  if (!S.streak.lastDay) return null;
  return daysBetween(S.streak.lastDay, dayKey());
}
function canUseFreeze() {
  const gap = streakGap();
  return gap === 2 && S.streak.freezes > 0 && S.streak.count > 0;
}
function useFreeze() {
  if (!canUseFreeze()) return;
  const missed = dayKey(new Date(startOfToday() - DAY_MS));
  S.streak.freezes--;
  S.streak.frozen.push(missed);
  S.streak.lastDay = missed;     // 補簽昨天，連續紀錄不中斷
  save();
  toast('🧊 補簽卡已使用，連續紀錄保住了！');
  render();
}
function bumpStreak() {
  const t = dayKey();
  if (S.streak.lastDay === t) return;
  const gap = S.streak.lastDay ? daysBetween(S.streak.lastDay, t) : null;
  S.streak.count = (gap === 1) ? S.streak.count + 1 : 1;
  S.streak.lastDay = t;
  S.streak.best = Math.max(S.streak.best || 0, S.streak.count);
}
/* 開啟時檢查是否已斷簽（間隔 >2 天且沒補簽） */
function checkStreakBroken() {
  const gap = streakGap();
  if (gap != null && gap > 2) S.streak.count = 0;
}

/* ---------------------------- 每日內容組裝 ---------------------------- */
function poolCards(phase) {
  let list = CARDS.filter(c => phase.pools.indexOf(c.scenario) >= 0);
  if (phase.starOnly) {
    const stars = list.filter(c => c.star);
    if (stars.length) list = stars;
  }
  return list;
}

function newCardsToday(phase, dueCount) {
  const rec = dayRec(dayKey());
  const limit = (dueCount > 25 ? 4 : S.settings.newPerDay) - rec.introduced;
  if (limit <= 0) return [];
  const pool = poolCards(phase).filter(c => {
    const st = S.cards[c.id];
    return !st || st.status === 'new';
  });
  // 診斷標為「生疏」的優先，其次高頻卡
  const rank = c => {
    const st = S.cards[c.id];
    return (st && st.diagRusty ? 0 : 2) + (c.star ? 0 : 1);
  };
  pool.sort((a, b) => rank(a) - rank(b));
  return pool.slice(0, limit);
}

function buildWarmup() {
  const yStart = startOfToday() - DAY_MS, yEnd = startOfToday() - 1;
  let pool = CARDS.filter(c => {
    const st = S.cards[c.id];
    return st && st.lastReviewed && st.lastReviewed >= yStart && st.lastReviewed <= yEnd;
  });
  if (pool.length < 4) {
    const extra = CARDS.filter(c => {
      const st = S.cards[c.id];
      return st && st.status !== 'new' && pool.indexOf(c) < 0;
    });
    pool = pool.concat(sample(extra, 8 - pool.length));
  }
  if (pool.length < 4) return [];
  const picked = sample(pool, Math.min(5, pool.length));
  return picked.map(c => {
    const distractPool = CARDS.filter(x => x.id !== c.id && x.type === c.type);
    const wrong = sample(distractPool.length >= 3 ? distractPool : CARDS.filter(x => x.id !== c.id), 3);
    return { card: c, options: shuffle([c].concat(wrong)) };
  });
}

function buildSrsQueue(phase) {
  const due = dueCardIds();
  const newOnes = newCardsToday(phase, due.length).map(c => c.id);
  newOnes.forEach(id => { const st = cs(id); st.status = 'learning'; st.dueDate = Date.now(); });
  if (newOnes.length) { dayRec(dayKey()).introduced += newOnes.length; save(); }

  let queue = shuffle(due).concat(newOnes);

  // 末期交錯：已標記「已經會了」的卡隨機抽查
  if (phase.key === 'MIX' || phase.key === 'FINE') {
    const known = CARDS.filter(c => S.cards[c.id] && S.cards[c.id].status === 'known');
    sample(known, Math.min(3, known.length)).forEach(c => queue.push(c.id));
  }
  return queue.map(id => ({ id: id, isNew: newOnes.indexOf(id) >= 0, isSpot: S.cards[id].status === 'known' }));
}

function pickDialogue(phase) {
  let pool = DIALOGUES.filter(d => phase.pools.indexOf(d.scenario) >= 0);
  if (!pool.length) pool = DIALOGUES;
  return pool[curriculumDay() % pool.length];
}

function buildKanjiQuiz(phase) {
  const all = CARDS.filter(c => c.scenario === 'kanji');
  const rank = c => {
    const st = S.cards[c.id];
    if (st && st.status === 'learning') return 0;
    if (c.star) return 1;
    return phase.key === 'C' || phase.key === 'MIX' || phase.key === 'FINE' ? 2 : 3;
  };
  const ordered = shuffle(all).sort((a, b) => rank(a) - rank(b));
  return ordered.slice(0, 6).map(c => {
    const wrong = sample(all.filter(x => x.id !== c.id), 3);
    return { card: c, options: shuffle([c].concat(wrong)) };
  });
}

/* 從一句答案裡找出對應的卡片（用來把對話自評餵回 SRS） */
function linkedCards(jp) {
  return CARDS.filter(c => c.jp.indexOf('〜') < 0 && c.jp.length >= 4 && jp.indexOf(c.jp) >= 0);
}

/* ==========================================================================
   畫面
   ========================================================================== */
let route = 'home';
let L = null;   // 每日課程 session
let T = null;   // 一日東京 session
let D = null;   // 診斷 session

const app = () => $('#app');

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

function render() {
  const el = app();
  el.scrollTop = 0;
  window.scrollTo(0, 0);
  if (route === 'home') el.innerHTML = viewHome();
  else if (route === 'diag') el.innerHTML = viewDiag();
  else if (route === 'lesson') el.innerHTML = viewLesson();
  else if (route === 'tokyo') el.innerHTML = viewTokyo();
  else if (route === 'browse') el.innerHTML = viewBrowse();
  else if (route === 'backup') el.innerHTML = viewBackup();
  afterRender();
}
function go(r) { route = r; render(); }

/* ---------------------------- 首頁 ---------------------------- */
function ring(pct, color, size) {
  size = size || 72;
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="8"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

function viewHome() {
  refreshFreezeMonth();
  checkStreakBroken();
  const dl = daysLeft();
  const phase = currentPhase();
  const vd = curriculumDay();
  const rec = dayRec(dayKey());
  const due = dueCardIds().length;
  const doneToday = rec.done;
  const totalTasks = 5;
  const doneStages = Object.keys(rec.stages).filter(k => rec.stages[k]).length;

  let banner = '';
  if (canUseFreeze()) {
    banner = `<div class="banner">
      <div>🧊 昨天沒練到。這個月還有 <b>${S.streak.freezes}</b> 張補簽卡，要用一張保住 ${S.streak.count} 天連續紀錄嗎？</div>
      <button class="btn small" data-act="freeze">用補簽卡</button>
    </div>`;
  }

  if (!S.diag.done) {
    const total = CARDS.length;
    const doneN = S.diag.cursor;
    return `
    ${header()}
    <div class="countdown">
      <div class="cd-label">距離東京</div>
      <div class="cd-num">${dl}</div>
      <div class="cd-label">天 ・ 2026 / 08 / 27 🛫</div>
    </div>
    <div class="card hero">
      <div class="hero-emoji">🧭</div>
      <h2>先做一次診斷</h2>
      <p class="muted">你不是從零開始 —— 先快速掃過全部 ${total} 張卡，把「已經會的」挑掉，剩下的才進入複習排程。分 3 天完成，每天最多 50 張。</p>
      <div class="progress"><div class="progress-fill" style="width:${(doneN / total * 100).toFixed(1)}%"></div></div>
      <div class="muted small">已分流 ${doneN} / ${total} 張 ・ 已完成 ${S.diag.sessions} / 3 次</div>
      <button class="btn primary big" data-act="startDiag">${doneN ? '繼續診斷' : '開始診斷'}</button>
    </div>
    ${footerNav()}`;
  }

  const groups = SCENARIO_GROUPS.map(g => {
    const st = groupStats(g);
    const pct = st.total ? st.strong / st.total : 0;
    const color = pct >= .7 ? 'var(--green)' : (st.strong + st.weak) > 0 ? 'var(--yellow)' : 'var(--gray)';
    return `<div class="scen">
      <div class="scen-ring">${ring(pct, color, 64)}<span class="scen-emoji">${g.emoji}</span></div>
      <div class="scen-name">${g.label}</div>
      <div class="scen-num"><b>${st.strong}</b>/${st.total}</div>
    </div>`;
  }).join('');

  const taskPct = doneToday ? 1 : doneStages / totalTasks;

  return `
  ${header()}
  ${banner}
  <div class="countdown">
    <div class="cd-label">距離東京</div>
    <div class="cd-num">${dl}</div>
    <div class="cd-label">天 ・ 2026 / 08 / 27 🛫</div>
  </div>

  <div class="row2">
    <div class="card stat">
      <div class="stat-big">🔥 ${S.streak.count}</div>
      <div class="muted small">連續學習天數</div>
      <div class="muted xsmall">補簽卡 ${'🧊'.repeat(S.streak.freezes) || '—'} （每月 2 張）</div>
    </div>
    <div class="card stat">
      <div class="ring-wrap">${ring(taskPct, doneToday ? 'var(--green)' : 'var(--primary)', 76)}
        <div class="ring-center">${doneToday ? '✅' : doneStages + '/' + totalTasks}</div></div>
      <div class="muted small">今日任務</div>
    </div>
  </div>

  <div class="card">
    <div class="phase-tag">Day ${vd} ・ ${phase.name}</div>
    <div class="muted small">${phase.desc}</div>
    <div class="due-line">今日到期 <b>${due}</b> 張${due > 25 ? '<span class="warn"> ・ 卡量偏多，今天新卡自動降為 4 張</span>' : ''}</div>
    <button class="btn primary big" data-act="startLesson">${doneToday ? '🔁 再練一次' : '▶︎ 開始今日 30 分鐘'}</button>
    ${doneToday ? '<div class="muted small center">今天已完成 ✨ 明天見！</div>' : ''}
  </div>

  <div class="card">
    <h3>情境掌握度</h3>
    <div class="scen-grid">${groups}</div>
    <div class="legend"><span><i class="dot green"></i>熟練</span><span><i class="dot yellow"></i>生疏</span><span><i class="dot gray"></i>未學</span></div>
  </div>

  <div class="card ${tokyoUnlocked() ? 'tokyo-card' : 'locked'}">
    <div class="tokyo-head"><span class="big-emoji">🗼</span>
      <div><h3>「一日東京」交錯模擬</h3>
      <div class="muted small">${tokyoUnlocked() ? '機場 → 車站 → 飯店 → 拉麵 → 退稅 → 迷路 → check-in' : `Day 22 解鎖（現在 Day ${vd}）`}</div></div>
    </div>
    ${tokyoUnlocked()
      ? `<button class="btn accent big" data-act="startTokyo">${S.tokyo.runs.length ? '再闖一次' : '開始闖關'}</button>
         ${S.tokyo.runs.length ? `<div class="muted small center">已通關 ${S.tokyo.runs.length} 次 🎌</div>` : ''}`
      : '<div class="lock-note">🔒 尚未解鎖</div>'}
  </div>

  ${footerNav()}`;
}

function header() {
  return `<div class="topbar">
    <div class="brand">🏮 東京日語衝刺</div>
    <button class="icon-btn" data-act="go-backup" title="備份">⚙️</button>
  </div>`;
}
function footerNav() {
  return `<div class="footnav">
    <button class="btn ghost" data-act="go-browse">📚 卡片庫</button>
    <button class="btn ghost" data-act="go-backup">💾 備份 / 還原</button>
  </div><div class="pad"></div>`;
}

/* ---------------------------- 診斷模式 ---------------------------- */
function startDiag() {
  if (!S.diag.order) { S.diag.order = shuffle(CARDS.map(c => c.id)); save(); }
  D = { count: 0, limit: 50 };
  go('diag');
}
function viewDiag() {
  const total = CARDS.length;
  const i = S.diag.cursor;
  if (i >= total) {
    S.diag.done = true; save();
    return celebrateBlock('🎉', '診斷完成！',
      `你標記了 <b>${S.diag.known}</b> 張「已經會」、<b>${S.diag.rusty}</b> 張「生疏」。<br>
       生疏的卡不會一次全丟給你 —— 會依 30 天課表分階段、每天約 ${S.settings.newPerDay} 張慢慢釋出。<br>
       「已經會」的卡不進複習，但末期模擬會隨機抽查。`,
      '進入每日課程', 'finishDiag');
  }
  if (D && D.count >= D.limit) {
    return celebrateBlock('☕️', '今天的診斷完成了',
      `已分流 ${i} / ${total} 張。<br>診斷刻意分 3 天做完 —— 一次掃太多，判斷會失準。`,
      '回首頁', 'finishDiagSession', '不等了，繼續診斷', 'contDiag');
  }
  const c = CARD_BY_ID[S.diag.order[i]];
  const sc = SCENARIOS[c.scenario];
  return `
  <div class="topbar"><button class="icon-btn" data-act="go-home">←</button>
    <div class="brand">診斷分流</div><div class="counter">${i + 1} / ${total}</div></div>
  <div class="progress slim"><div class="progress-fill" style="width:${((i) / total * 100).toFixed(1)}%"></div></div>
  <div class="card diag-card">
    <div class="badge" style="background:${sc.color}1a;color:${sc.color}">${sc.emoji} ${sc.name}</div>
    <div class="diag-q">${esc(c.zh)}</div>
    <div class="muted">心裡默唸一次日語 —— 說得出來嗎？</div>
  </div>
  <div class="diag-btns">
    <button class="btn known" data-act="diagKnown">✅ 已經會了</button>
    <button class="btn rusty" data-act="diagRusty">😅 生疏了</button>
  </div>
  <div class="muted small center">「已經會了」的卡不會進入每日複習，但末期模擬會隨機抽查。</div>`;
}
function diagAnswer(known) {
  const id = S.diag.order[S.diag.cursor];
  const st = cs(id);
  if (known) {
    st.status = 'known'; st.dueDate = null; st.diagRusty = false;
    S.diag.known++;
  } else {
    // 生疏 → 納入 SRS 候補池，實際排入由 30 天課表按階段、每天 8 張釋出
    st.status = 'new'; st.diagRusty = true; st.dueDate = null;
    st.interval = 0; st.repetitions = 0;
    S.diag.rusty++;
  }
  S.diag.cursor++;
  D.count++;
  if (D.count >= D.limit || S.diag.cursor >= CARDS.length) {
    S.diag.sessions++;
    S.diag.lastDay = dayKey();
  }
  save();
  render();
}

/* ---------------------------- 每日課程 ---------------------------- */
const STAGE_META = [
  { key: 'warmup', name: '暖身', emoji: '☀️', mins: 3 },
  { key: 'srs', name: '主複習', emoji: '🎴', mins: 8 },
  { key: 'dialog', name: '情境對話', emoji: '🗣️', mins: 15 },
  { key: 'kanji', name: '漢字快閃', emoji: '🈶', mins: 4 },
  { key: 'reflect', name: '反思', emoji: '✍️', mins: 1 }
];

function startLesson() {
  const phase = currentPhase();
  const due = dueCardIds();
  L = {
    phase: phase,
    stage: 0, idx: 0, flipped: false, picked: null, revealed: false,
    warmup: buildWarmup(),
    srs: buildSrsQueue(phase),
    dialog: pickDialogue(phase),
    kanji: buildKanjiQuiz(phase),
    stats: { warmupRight: 0, warmupTotal: 0, srsDone: 0, kanjiRight: 0, kanjiTotal: 0, dialogDone: 0 },
    overload: due.length > 25,
    rec: null
  };
  dayRec(dayKey()).dialogId = L.dialog.id;
  save();
  if (L.overload) toast('今天到期卡超過 25 張，新卡自動降為 4 張 👍');
  go('lesson');
}

function lessonBar() {
  const segs = STAGE_META.map((s, i) => {
    const cls = i < L.stage ? 'done' : i === L.stage ? 'cur' : '';
    return `<div class="seg ${cls}" title="${s.name}"><span>${s.emoji}</span></div>`;
  }).join('');
  return `<div class="topbar"><button class="icon-btn" data-act="quitLesson">✕</button>
    <div class="brand">${STAGE_META[Math.min(L.stage, 4)].emoji} ${STAGE_META[Math.min(L.stage, 4)].name}
    <span class="muted xsmall">約 ${STAGE_META[Math.min(L.stage, 4)].mins} 分</span></div>
    <div class="counter"></div></div>
    <div class="segbar">${segs}</div>`;
}

function viewLesson() {
  if (!L) { route = 'home'; return viewHome(); }
  if (L.stage === 0) return lessonBar() + stageWarmup();
  if (L.stage === 1) return lessonBar() + stageSrs();
  if (L.stage === 2) return lessonBar() + stageDialog();
  if (L.stage === 3) return lessonBar() + stageKanji();
  if (L.stage === 4) return lessonBar() + stageReflect();
  return stageCelebrate();
}

function nextStage() {
  const rec = dayRec(dayKey());
  rec.stages[STAGE_META[L.stage].key] = true;
  L.stage++; L.idx = 0; L.flipped = false; L.picked = null; L.revealed = false;
  if (L.stage >= 5) finishDay();
  save(); render();
}

/* --- 1. 暖身 --- */
function stageWarmup() {
  if (!L.warmup.length) return skipBlock('昨天沒有複習紀錄，暖身先跳過 ☀️');
  if (L.idx >= L.warmup.length) return doneBlock(`暖身完成 ${L.stats.warmupRight} / ${L.stats.warmupTotal} ✅`);
  const q = L.warmup[L.idx];
  const opts = q.options.map(o => {
    let cls = '';
    if (L.picked) {
      if (o.id === q.card.id) cls = 'right';
      else if (o.id === L.picked) cls = 'wrong';
    }
    return `<button class="opt ${cls}" data-act="warmupPick" data-id="${o.id}">${esc(o.zh)}</button>`;
  }).join('');
  return `
  <div class="counter-line">${L.idx + 1} / ${L.warmup.length}</div>
  <div class="card quiz-card">
    <div class="muted small">這句是什麼意思？</div>
    <div class="jp-quiz">${esc(q.card.jp)}</div>
    <div class="kana">${esc(q.card.kana)}</div>
  </div>
  <div class="opts">${opts}</div>
  ${L.picked ? '<button class="btn primary big" data-act="warmupNext">下一題 →</button>' : ''}`;
}

/* --- 2. SRS 主複習 --- */
function stageSrs() {
  if (!L.srs.length) return skipBlock('今天沒有到期的卡，直接進下一關 🎴');
  if (L.idx >= L.srs.length) return doneBlock(`主複習完成 ${L.stats.srsDone} 張 🎴`);
  const item = L.srs[L.idx];
  const c = CARD_BY_ID[item.id];
  const sc = SCENARIOS[c.scenario];
  const badge = item.isNew ? '<span class="tag new">新卡</span>'
    : item.isSpot ? '<span class="tag spot">抽查</span>' : '';
  return `
  <div class="counter-line">${L.idx + 1} / ${L.srs.length}</div>
  <div class="flip ${L.flipped ? 'flipped' : ''}" data-act="flip">
    <div class="flip-inner">
      <div class="face front">
        <div class="badge" style="background:${sc.color}1a;color:${sc.color}">${sc.emoji} ${sc.name} ${badge}</div>
        <div class="zh-big">${esc(c.zh)}</div>
        <div class="say-hint">🗣️ 先大聲說出日語<br><span class="muted small">再點卡片翻開對答案</span></div>
      </div>
      <div class="face back">
        <div class="jp-big">${esc(c.jp)}</div>
        <div class="kana">${esc(c.kana)}</div>
        ${S.settings.romaji ? `<div class="romaji">${esc(c.romaji)}</div>` : ''}
        <div class="zh-small">${esc(c.zh)}</div>
      </div>
    </div>
  </div>
  ${L.flipped ? gradeButtons('srsGrade') : '<div class="muted center tap-hint">👆 說完了就點卡片</div>'}`;
}

function gradeButtons(act) {
  const g = [
    [0, '完全忘記', 'g0'], [2, '很勉強', 'g2'], [3, '想起來了', 'g3'],
    [4, '順暢', 'g4'], [5, '秒答', 'g5']
  ];
  return `<div class="grades">${g.map(x =>
    `<button class="grade ${x[2]}" data-act="${act}" data-q="${x[0]}"><b>${x[1]}</b><span>${x[0]}</span></button>`
  ).join('')}</div>`;
}

/* --- 3. 情境對話 --- */
function stageDialog() {
  const d = L.dialog;
  if (L.idx >= d.steps.length) return doneBlock(`「${d.title}」走完了 ${d.emoji}`);
  const step = d.steps[L.idx];
  const intro = L.idx === 0 ? `<div class="intro">${d.emoji} <b>${esc(d.title)}</b><br><span class="muted">${esc(d.intro)}</span></div>` : '';
  const npc = step.npc ? `<div class="npc">
      <div class="npc-avatar">🧑‍🍳</div>
      <div class="bubble"><div class="bubble-jp">${esc(step.npc.jp)}</div>
      <div class="bubble-kana">${esc(step.npc.kana)}</div>
      <div class="bubble-zh">${esc(step.npc.zh)}</div></div></div>` : '';
  const nar = step.narration ? `<div class="narration">${esc(step.narration)}</div>` : '';
  const ans = L.revealed ? `
    <div class="card answer-card">
      <div class="muted small">參考答案</div>
      <div class="jp-big">${esc(step.answer.jp)}</div>
      <div class="kana">${esc(step.answer.kana)}</div>
      ${S.settings.romaji ? `<div class="romaji">${esc(step.answer.romaji)}</div>` : ''}
      ${step.tip ? `<div class="tip">💡 ${esc(step.tip)}</div>` : ''}
    </div>
    ${gradeButtons('dialogGrade')}`
    : `<button class="btn primary big" data-act="reveal">看參考答案</button>`;

  return `
  <div class="counter-line">${L.idx + 1} / ${d.steps.length}</div>
  ${intro}${nar}${npc}
  <div class="card prompt-card">
    <div class="muted small">換你開口</div>
    <div class="prompt">${esc(step.prompt)}</div>
    ${recorderUI()}
  </div>
  ${ans}`;
}

/* --- 4. 漢字快閃 --- */
function stageKanji() {
  if (L.idx >= L.kanji.length) return doneBlock(`漢字快閃 ${L.stats.kanjiRight} / ${L.stats.kanjiTotal} 🈶`);
  const q = L.kanji[L.idx];
  const opts = q.options.map(o => {
    let cls = '';
    if (L.picked) {
      if (o.id === q.card.id) cls = 'right';
      else if (o.id === L.picked) cls = 'wrong';
    }
    return `<button class="opt ${cls}" data-act="kanjiPick" data-id="${o.id}">${esc(o.zh)}</button>`;
  }).join('');
  return `
  <div class="counter-line">${L.idx + 1} / ${L.kanji.length}</div>
  <div class="card sign-card">
    <div class="sign">${esc(q.card.jp)}</div>
    ${L.picked ? `<div class="kana">${esc(q.card.kana)} ・ ${esc(q.card.romaji)}</div>` : ''}
  </div>
  <div class="opts">${opts}</div>
  ${L.picked ? '<button class="btn primary big" data-act="kanjiNext">下一張 →</button>' : ''}`;
}

/* --- 5. 反思 --- */
function stageReflect() {
  const p = REFLECTION_PROMPTS[new Date().getDate() % REFLECTION_PROMPTS.length];
  const prev = dayRec(dayKey()).reflection || '';
  return `
  <div class="card">
    <div class="hero-emoji">✍️</div>
    <h2>${esc(p)}</h2>
    <p class="muted small">寫一行就好，30 秒。寫下來的東西，明天你會記得。</p>
    <input id="reflect-input" class="input" type="text" maxlength="120" placeholder="打一行字…" value="${esc(prev)}">
    <button class="btn primary big" data-act="saveReflect">完成今天 🎉</button>
    <button class="btn ghost" data-act="saveReflect" data-skip="1">跳過</button>
  </div>`;
}

function stageCelebrate() {
  const rec = dayRec(dayKey());
  return `<div class="confetti">${confettiPieces('🎊🎉✨🏮🗼🍜').map((e, i) => `<span style="--i:${i}">${e}</span>`).join('')}</div>
  <div class="card hero celebrate">
    <div class="hero-emoji big">🎉</div>
    <h2>今天完成了！</h2>
    <div class="recap">
      <div><b>${rec.reviewed}</b><span>複習卡</span></div>
      <div><b>${rec.introduced}</b><span>新卡</span></div>
      <div><b>${rec.kanjiRight}/${rec.kanjiTotal}</b><span>漢字</span></div>
    </div>
    <div class="streak-line">🔥 連續 <b>${S.streak.count}</b> 天 ・ 距東京還有 <b>${daysLeft()}</b> 天</div>
    ${rec.reflection ? `<div class="quote">「${esc(rec.reflection)}」</div>` : ''}
    <button class="btn primary big" data-act="go-home">回首頁</button>
  </div>`;
}

/* Array.from 而非 split('')：emoji 是 UTF-16 代理對，split('') 會把它切成兩半 */
function confettiPieces(str) { return Array.from(str); }

function skipBlock(msg) {
  return `<div class="card hero"><div class="hero-emoji">⏭️</div><p>${esc(msg)}</p>
    <button class="btn primary big" data-act="nextStage">繼續 →</button></div>`;
}
function doneBlock(msg) {
  return `<div class="card hero"><div class="hero-emoji">✅</div><h2>${msg}</h2>
    <button class="btn primary big" data-act="nextStage">下一關 →</button></div>`;
}
function celebrateBlock(emoji, title, html, btn, act, btn2, act2) {
  return `<div class="card hero"><div class="hero-emoji">${emoji}</div><h2>${title}</h2>
    <p class="muted">${html}</p>
    <button class="btn primary big" data-act="${act}">${btn}</button>
    ${btn2 ? `<button class="btn ghost" data-act="${act2}">${btn2}</button>` : ''}</div>`;
}

function finishDay() {
  const rec = dayRec(dayKey());
  rec.done = true;
  bumpStreak();
  save();
}

/* ---------------------------- 一日東京 ---------------------------- */
function startTokyo() {
  const flat = [];
  TOKYO_DAY.stations.forEach((st, si) => st.steps.forEach((s, i) => flat.push({ st: si, first: i === 0, step: s })));
  T = { i: 0, flat: flat, revealed: false, scores: [] };
  go('tokyo');
}
function viewTokyo() {
  if (!T) { route = 'home'; return viewHome(); }
  if (T.i >= T.flat.length) {
    const avg = T.scores.length ? (T.scores.reduce((a, b) => a + b, 0) / T.scores.length).toFixed(1) : '—';
    return `<div class="confetti">${confettiPieces('🎌🗼🎊✨🍜🚃').map((e, i) => `<span style="--i:${i}">${e}</span>`).join('')}</div>
    <div class="card hero celebrate">
      <div class="hero-emoji big">🎌</div>
      <h2>東京一日通關！</h2>
      <p class="muted">從落地到 check-in，${T.flat.length} 個關卡你都開口了。<br>平均自評 <b>${avg}</b> / 5。</p>
      <button class="btn primary big" data-act="tokyoDone">收下這面旗子</button>
    </div>`;
  }
  const cur = T.flat[T.i];
  const station = TOKYO_DAY.stations[cur.st];
  const step = cur.step;
  const head = cur.first ? `<div class="station"><span class="big-emoji">${station.emoji}</span>
    <div><b>${esc(station.place)}</b><div class="muted small">${esc(station.narration)}</div></div></div>` : '';
  const npc = step.npc ? `<div class="npc"><div class="npc-avatar">🧑</div>
    <div class="bubble"><div class="bubble-jp">${esc(step.npc.jp)}</div>
    <div class="bubble-kana">${esc(step.npc.kana)}</div>
    <div class="bubble-zh">${esc(step.npc.zh)}</div></div></div>` : '';
  const ans = T.revealed ? `
    <div class="card answer-card">
      <div class="muted small">參考答案</div>
      <div class="jp-big">${esc(step.answer.jp)}</div>
      <div class="kana">${esc(step.answer.kana)}</div>
      ${S.settings.romaji ? `<div class="romaji">${esc(step.answer.romaji)}</div>` : ''}
    </div>${gradeButtons('tokyoGrade')}`
    : `<button class="btn primary big" data-act="tokyoReveal">看參考答案</button>`;
  return `
  <div class="topbar"><button class="icon-btn" data-act="go-home">✕</button>
    <div class="brand">🗼 一日東京</div><div class="counter">${T.i + 1}/${T.flat.length}</div></div>
  <div class="progress slim"><div class="progress-fill" style="width:${(T.i / T.flat.length * 100).toFixed(1)}%"></div></div>
  ${head}${npc}
  <div class="card prompt-card">
    <div class="muted small">換你開口</div>
    <div class="prompt">${esc(step.prompt)}</div>
    ${recorderUI()}
  </div>
  ${ans}`;
}

/* ---------------------------- 卡片庫 ---------------------------- */
let browseFilter = 'all';
function viewBrowse() {
  const chips = [['all', '全部'], ['star', '★ 高頻']].concat(
    Object.keys(SCENARIOS).map(k => [k, SCENARIOS[k].emoji + ' ' + SCENARIOS[k].name]));
  let list = CARDS;
  if (browseFilter === 'star') list = CARDS.filter(c => c.star);
  else if (browseFilter !== 'all') list = CARDS.filter(c => c.scenario === browseFilter);

  const rows = list.map(c => {
    const lv = cardLevel(c);
    const dot = lv === 'strong' ? 'green' : lv === 'weak' ? 'yellow' : 'gray';
    const st = S.cards[c.id];
    let meta = '未學';
    if (st && st.status === 'known') meta = '已會';
    else if (st && st.status === 'learning' && st.dueDate) {
      const d = Math.max(0, Math.ceil((st.dueDate - startOfToday()) / DAY_MS));
      meta = d <= 0 ? '今天' : d + ' 天後';
    } else if (st && st.diagRusty) meta = '待排入';
    return `<div class="browse-row">
      <i class="dot ${dot}"></i>
      <div class="br-main"><div class="br-jp">${c.star ? '★ ' : ''}${esc(c.jp)}</div>
      <div class="br-kana">${esc(c.kana)}${S.settings.romaji ? ' ・ ' + esc(c.romaji) : ''}</div>
      <div class="br-zh">${esc(c.zh)}</div></div>
      <div class="br-meta">${meta}</div>
    </div>`;
  }).join('');

  return `<div class="topbar"><button class="icon-btn" data-act="go-home">←</button>
    <div class="brand">📚 卡片庫（${list.length}）</div><div class="counter"></div></div>
  <div class="chips">${chips.map(c => `<button class="chip ${browseFilter === c[0] ? 'on' : ''}" data-act="filter" data-k="${c[0]}">${c[1]}</button>`).join('')}</div>
  <div class="card list">${rows}</div><div class="pad"></div>`;
}

/* ---------------------------- 備份 ---------------------------- */
function viewBackup() {
  const diagnosed = CARDS.filter(c => { const st = S.cards[c.id]; return st && (st.status !== 'new' || st.diagRusty); }).length;
  const inSrs = CARDS.filter(c => S.cards[c.id] && S.cards[c.id].status === 'learning').length;
  const waiting = CARDS.filter(c => { const st = S.cards[c.id]; return st && st.status === 'new' && st.diagRusty; }).length;
  return `<div class="topbar"><button class="icon-btn" data-act="go-home">←</button>
    <div class="brand">⚙️ 設定與備份</div><div class="counter"></div></div>
  <div class="card">
    <h3>進度概況</h3>
    <div class="kv"><span>開始日期</span><b>${S.startDay}</b></div>
    <div class="kv"><span>虛擬進度</span><b>Day ${curriculumDay()} ・ ${currentPhase().name}</b></div>
    <div class="kv"><span>已診斷卡片</span><b>${diagnosed} / ${CARDS.length}</b></div>
    <div class="kv"><span>已排入複習</span><b>${inSrs} 張</b></div>
    <div class="kv"><span>等待釋出</span><b>${waiting} 張</b></div>
    <div class="kv"><span>連續天數</span><b>${S.streak.count}（最佳 ${S.streak.best || 0}）</b></div>
    <div class="kv"><span>本月補簽卡</span><b>${S.streak.freezes} / 2</b></div>
  </div>
  <div class="card">
    <h3>顯示</h3>
    <label class="switch"><input type="checkbox" id="romaji-toggle" ${S.settings.romaji ? 'checked' : ''}> 顯示羅馬字</label>
    <div class="kv"><span>每日新卡量</span>
      <select id="newperday" class="select">
        ${[4, 6, 8, 10, 12].map(n => `<option value="${n}" ${S.settings.newPerDay === n ? 'selected' : ''}>${n} 張</option>`).join('')}
      </select></div>
  </div>
  <div class="card">
    <h3>備份 / 還原</h3>
    <p class="muted small">所有進度只存在這台裝置的瀏覽器裡。換手機、清快取前，記得先匯出。</p>
    <button class="btn primary" data-act="export">⬇️ 匯出 JSON 備份</button>
    <button class="btn ghost" data-act="importClick">⬆️ 匯入備份檔</button>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
  </div>
  <div class="card danger">
    <h3>重來一次</h3>
    <p class="muted small">清除全部進度，回到診斷模式。無法復原。</p>
    <button class="btn warn" data-act="reset">🗑 清除所有進度</button>
  </div><div class="pad"></div>`;
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '東京日語衝刺-備份-' + dayKey() + '.json';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast('已匯出備份檔 💾');
}
function importJSON(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const obj = JSON.parse(fr.result);
      if (!obj || typeof obj !== 'object' || !('cards' in obj)) throw new Error('格式不符');
      S = Object.assign(defaultState(), obj);
      save(); toast('備份已還原 ✅'); go('home');
    } catch (e) { toast('❌ 匯入失敗：' + e.message); }
  };
  fr.readAsText(file);
}

/* ---------------------------- 錄音（自我對照用） ---------------------------- */
let REC = { mr: null, chunks: [], url: null, on: false };
function recSupported() {
  return typeof MediaRecorder !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
}
function recorderUI() {
  if (!recSupported()) return '';
  return `<div class="rec">
    <button class="btn rec-btn ${REC.on ? 'recording' : ''}" data-act="rec">${REC.on ? '⏹ 停止錄音' : '🎙️ 錄下自己'}</button>
    ${REC.url ? `<audio class="audio" controls src="${REC.url}"></audio>` : ''}
  </div>`;
}
async function toggleRec() {
  if (REC.on) {
    REC.mr && REC.mr.state !== 'inactive' && REC.mr.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    REC.chunks = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = e => e.data.size && REC.chunks.push(e.data);
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (REC.url) URL.revokeObjectURL(REC.url);
      REC.url = URL.createObjectURL(new Blob(REC.chunks, { type: mr.mimeType || 'audio/webm' }));
      REC.on = false; REC.mr = null; render();
    };
    REC.mr = mr; REC.on = true;
    mr.start(); render();
  } catch (e) { toast('無法使用麥克風（可能未授權）'); }
}
function clearRec() {
  if (REC.on && REC.mr && REC.mr.state !== 'inactive') REC.mr.stop();
  if (REC.url) { URL.revokeObjectURL(REC.url); REC.url = null; }
  REC.on = false;
}

/* ==========================================================================
   事件
   ========================================================================== */
const ACTIONS = {
  'go-home': () => { clearRec(); go('home'); },
  'go-browse': () => go('browse'),
  'go-backup': () => go('backup'),
  'filter': (el) => { browseFilter = el.dataset.k; render(); },
  'freeze': useFreeze,

  'startDiag': startDiag,
  'diagKnown': () => diagAnswer(true),
  'diagRusty': () => diagAnswer(false),
  'finishDiag': () => { bumpStreak(); save(); go('home'); },
  'finishDiagSession': () => go('home'),
  'contDiag': () => { D.limit += 50; render(); },

  'startLesson': startLesson,
  'quitLesson': () => { clearRec(); if (confirm('離開今日課程？已完成的部分會保留。')) go('home'); },
  'nextStage': nextStage,

  'warmupPick': (el) => {
    if (L.picked) return;
    const q = L.warmup[L.idx];
    L.picked = el.dataset.id;
    L.stats.warmupTotal++;
    if (L.picked === q.card.id) L.stats.warmupRight++;
    render();
  },
  'warmupNext': () => { L.idx++; L.picked = null; render(); },

  'flip': () => { if (!L.flipped) { L.flipped = true; render(); } },
  'srsGrade': (el) => {
    const q = +el.dataset.q;
    const item = L.srs[L.idx];
    const st = cs(item.id);
    if (st.status === 'known' && q >= 3) {
      st.lastReviewed = Date.now();            // 抽查通過 → 維持 known，不進 SRS
    } else {
      schedule(st, q);                          // 抽查失手 → 轉入 SRS
    }
    L.stats.srsDone++;
    dayRec(dayKey()).reviewed++;
    L.idx++; L.flipped = false;
    save(); render();
  },

  'reveal': () => { L.revealed = true; render(); },
  'dialogGrade': (el) => {
    const q = +el.dataset.q;
    const step = L.dialog.steps[L.idx];
    linkedCards(step.answer.jp).forEach(c => {
      const st = cs(c.id);
      if (st.status === 'known' && q >= 3) return;
      schedule(st, q);
      dayRec(dayKey()).reviewed++;
    });
    L.stats.dialogDone++;
    L.idx++; L.revealed = false; clearRec();
    save(); render();
  },

  'kanjiPick': (el) => {
    if (L.picked) return;
    const q = L.kanji[L.idx];
    L.picked = el.dataset.id;
    L.stats.kanjiTotal++;
    const rec = dayRec(dayKey());
    rec.kanjiTotal++;
    if (L.picked === q.card.id) { L.stats.kanjiRight++; rec.kanjiRight++; }
    else { schedule(cs(q.card.id), 0); }        // 答錯 → 自動加入 SRS，明天再見
    save(); render();
  },
  'kanjiNext': () => { L.idx++; L.picked = null; render(); },

  'saveReflect': (el) => {
    const input = $('#reflect-input');
    const rec = dayRec(dayKey());
    if (!el.dataset.skip && input && input.value.trim()) {
      rec.reflection = input.value.trim();
      S.reflections.push({ day: dayKey(), text: rec.reflection });
    }
    nextStage();
  },

  'startTokyo': startTokyo,
  'tokyoReveal': () => { T.revealed = true; render(); },
  'tokyoGrade': (el) => {
    const q = +el.dataset.q;
    const step = T.flat[T.i].step;
    T.scores.push(q);
    linkedCards(step.answer.jp).forEach(c => {
      const st = cs(c.id);
      if (st.status === 'known' && q >= 3) return;
      schedule(st, q);
    });
    T.i++; T.revealed = false; clearRec();
    save(); render();
  },
  'tokyoDone': () => {
    S.tokyo.runs.push({ day: dayKey(), scores: T.scores });
    save(); clearRec(); go('home');
  },

  'export': exportJSON,
  'importClick': () => $('#import-file').click(),
  'reset': () => {
    if (!confirm('確定清除所有進度？此動作無法復原。')) return;
    if (!confirm('再確認一次：全部歸零，回到診斷模式。')) return;
    localStorage.removeItem(STORE_KEY);
    S = defaultState(); save(); go('home');
  },
  'rec': toggleRec
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});

function afterRender() {
  const f = $('#import-file');
  if (f) f.onchange = () => { if (f.files[0]) importJSON(f.files[0]); };
  const rt = $('#romaji-toggle');
  if (rt) rt.onchange = () => { S.settings.romaji = rt.checked; save(); toast('已更新'); };
  const np = $('#newperday');
  if (np) np.onchange = () => { S.settings.newPerDay = +np.value; save(); toast('每日新卡：' + np.value + ' 張'); };
  const ri = $('#reflect-input');
  if (ri) ri.addEventListener('keydown', e => { if (e.key === 'Enter') ACTIONS.saveReflect($('[data-act="saveReflect"]')); });
}

/* ---------------------------- 啟動 ---------------------------- */
load();
refreshFreezeMonth();
checkStreakBroken();
save();
render();
