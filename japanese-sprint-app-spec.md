# 東京旅遊日語 30 天衝刺複習 Web App — Claude Code 實作規格書

> 把這整份文件貼給 Claude Code，請它依規格實作。

## 專案概述

為一位台灣使用者（母語繁體中文、日文約 N5 程度、熟悉五十音）建立一個**純前端、單機可用**的日語複習 Web App。目標：在 2026/08/27 出發去東京家庭旅遊前，透過每天約 30 分鐘的複習，重拾旅遊日語的「口說」與「閱讀」能力。使用者是行程領隊，需要能在點餐、購物、交通問路、飯店等場景順暢開口。

**設計哲學**：這是「重啟休眠知識」而非從零學習。以認知科學為根據：間隔重複（SRS）、主動回憶（retrieval practice）、生產效應（唸出聲）、語塊學習（整句而非單字）、情境式學習。介面要活潑、像遊戲關卡，**絕對不要**像補習班教材。

## 技術要求

- **技術棧**：單一 HTML 檔（或 Vite + vanilla JS / React 皆可，但最終要能直接開啟使用，無需後端）。所有資料存 `localStorage`。
- **語言**：介面全繁體中文，日文內容附讀音（羅馬字＋假名）。
- **RWD**：手機優先（使用者主要用手機複習），桌面也要能用。
- **字型**：日文使用 `"Hiragino Sans", "Noto Sans JP", sans-serif`。
- **持久化**：卡片狀態、每日進度、streak 全存 localStorage，並提供「匯出 / 匯入 JSON 備份」功能。
- **出發日常數**：`TRIP_DATE = 2026-08-27`，全 App 顯示倒數天數。

## 核心功能模組

### 1. 首頁儀表板（Dashboard）
- 距 8/27 倒數天數（大字顯示）。
- 今日任務環：今日到期卡數 / 已完成數。
- 六大情境掌握度（色環或進度條）：`熟練(綠) / 生疏(黃) / 未學(灰)`。
- 連續學習天數 streak ＋ 每月 2 次「補簽卡」（Streak Freeze，漏一天可補救，避免焦慮）。
- 「開始今日 30 分鐘」大按鈕 → 進入每日課程流程。

### 2. 每日 30 分鐘課程流程（固定模板，依序自動串接）
1. **暖身（約 3 分）**：昨日到期卡的快速多選題（4 選 1，低負荷起步）。
2. **SRS 主複習（約 8 分）**：到期卡逐張出現。格式：顯示**中文＋情境提示** → 使用者先「大聲說出日語」→ 點擊翻卡看答案（日文＋讀音）→ 自評 0–5 分（按鈕：完全忘記 0 / 很勉強 2 / 想起來了 3 / 順暢 4 / 秒答 5）。評分餵入 SRS 演算法。
3. **情境對話（約 15 分）**：當日主題情境的角色扮演。App 扮演店員/站務員（顯示日文台詞＋中文翻譯），出中文提示要使用者開口回應 → 顯示參考答案 → 自評。每情境含 2–3 條分支（如：食券機店 vs 一般點餐）。若瀏覽器支援 `MediaRecorder`，提供「錄音 → 回放自我對照」功能（純自評，不做語音辨識評分）。
4. **漢字閱讀快閃（約 4 分）**：招牌/車站漢字卡（大字顯示如「精算」）→ 4 選 1 選出中文意思。答錯的卡自動加入 SRS。
5. **每日反思（30 秒）**：一句提示如「今天哪句最難說出口？」，可輸入一行文字（存 localStorage），然後顯示今日完成慶祝畫面。

### 3. SRS 排程引擎（簡化 SM-2，衝刺調校版）

卡片資料模型：
```javascript
{ id, jp, kana, romaji, zh, scenario, type, // type: "phrase" | "kanji" | "vocab"
  interval: 0, repetitions: 0, easeFactor: 2.5, dueDate: null,
  status: "new" | "learning" | "known" } // known = 診斷時標記已會
```

排程函式（必須照此實作）：
```javascript
function schedule(card, quality) { // quality 0–5
  if (quality < 3) {
    card.repetitions = 0;
    card.interval = 1; // 忘記 → 明天再見
  } else {
    if (card.repetitions === 0) card.interval = 1;
    else if (card.repetitions === 1) card.interval = 3; // 衝刺版：壓縮原 SM-2 的 6 天
    else card.interval = Math.round(card.interval * card.easeFactor);
    card.repetitions += 1;
  }
  card.easeFactor = Math.max(1.3,
    card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  // 衝刺上限：間隔不超過「距出發剩餘天數的一半」，確保出發前至少再見 1–2 次
  const daysLeft = Math.ceil((TRIP_DATE - Date.now()) / 86400000);
  card.interval = Math.min(card.interval, Math.max(1, Math.floor(daysLeft / 2)));
  card.dueDate = Date.now() + card.interval * 86400000;
  return card;
}
```

- 每日新卡量預設 8 張，若「今日到期卡 > 25 張」自動降為 4 張並提示使用者。
- 標記為 `known` 的卡不進 SRS，但會在末期交錯模擬中隨機出現抽查。

### 4. 診斷模式（Day 1–3 首次使用）
- 首次開啟時引導：快速掃過全部卡片（只看中文 → 自問能否說出日語 → 二選一按鈕「已經會了 / 生疏了」）。
- 「已經會了」→ `status: "known"`；「生疏了」→ 進入 SRS 排程。
- 每次診斷最多 50 張，分 3 天完成，之後才進入正式每日課程。

### 5. 30 天課表（依剩餘天數自動對映）
| 階段 | 天數 | 內容 |
|---|---|---|
| 診斷重啟 | Day 1–3 | 全卡診斷分流 |
| 區塊 A | Day 4–9 | 問候/數字/時間 ＋ 餐廳 |
| 區塊 B | Day 10–15 | 購物 ＋ 交通問路 |
| 區塊 C | Day 16–21 | 飯店 ＋ 招牌漢字閱讀 |
| 交錯模擬 | Day 22–27 | 「一日東京」串場模擬（機場→車站→飯店寄行李→餐廳→購物退稅），混合所有情境 |
| 高頻精煉 | Day 28–30 | 只練標記為高頻的 40 句 ＋ 修復策略句 |

若使用者晚開始，依 `daysLeft` 等比壓縮各階段。

### 6. 「一日東京」交錯模擬（Day 22 後解鎖）
一條連續劇情：抵達車站買 Suica → 問月台 → 到飯店寄行李 → 食券機拉麵店 → 藥妝店退稅 → 迷路問路 → 回飯店 check-in。每一站出中文情境 → 使用者口說 → 翻參考答案 → 自評。完成後顯示「東京一日通關！」。

## UI/UX 規範

- **視覺**：明亮活潑的旅遊感（可用日本元素：鳥居、電車、拉麵 emoji/簡單插圖），卡片圓角、大按鈕、大量留白。避免密集表格與教科書排版。
- **翻卡**：點擊翻轉動畫；自評按鈕用顏色區分（紅→黃→綠）。
- **遊戲化（克制）**：只用 streak、情境通關進度環、完成慶祝動畫。**不要**排行榜、XP 商店、浮誇音效。
- **可及性**：日文字級至少 24px（漢字閱讀卡 48px+），自評按鈕拇指可及。

## 內容資料庫（完整內建，存為 JS 常數）

> 以下為全部卡片內容，scenario 值：`basics`（基礎）、`repair`（修復策略）、`restaurant`（餐廳）、`shopping`（購物）、`transport`（交通）、`hotel`（飯店）、`kanji`（招牌閱讀）。標 ★ 的是高頻卡（Day 28–30 精煉用）。

### basics 基礎萬用（type: phrase）
| jp | kana/romaji | zh |
|---|---|---|
| ★すみません | sumimasen | 不好意思／借過／呼喚店員（萬用） |
| ★ありがとうございます | arigatō gozaimasu | 謝謝 |
| ★お願いします | onegai shimasu | 麻煩你了 |
| ★〜をください | 〜 o kudasai | 請給我〜 |
| ★〜てもいいですか | 〜te mo ii desu ka | 我可以〜嗎？ |
| ★〜はどこですか | 〜 wa doko desu ka | 〜在哪裡？ |
| ★〜はありますか | 〜 wa arimasu ka | 有〜嗎？ |
| ★いくらですか | ikura desu ka | 多少錢？ |
| 大丈夫です | daijōbu desu | 沒關係／不用了 |
| 結構です | kekkō desu | 不用了（婉拒） |
| おはようございます | ohayō gozaimasu | 早安 |
| こんにちは | konnichiwa | 你好（白天） |
| こんばんは | konbanwa | 晚上好 |

vocab 卡：數字 いち/に/さん/よん/ご/ろく/なな/はち/きゅう/じゅう；量詞 ひとつ/ふたつ/みっつ（個）、ひとり/ふたり/さんにん（人）、〜枚（票）、〜本（瓶）、〜杯（杯）；時間 〜時/〜分、今日、明日。

### repair 修復策略（type: phrase，全部 ★）
| jp | romaji | zh |
|---|---|---|
| もう一度お願いします | mō ichido onegai shimasu | 請再說一次 |
| ゆっくり話してください | yukkuri hanashite kudasai | 請說慢一點 |
| すみません、わかりません | sumimasen, wakarimasen | 不好意思，我聽不懂 |
| 日本語が少しだけわかります | nihongo ga sukoshi dake wakarimasu | 我只懂一點日語 |
| ここがわかりません | koko ga wakarimasen | 我不懂這個部分（指著） |
| 英語のメニューはありますか | eigo no menyū wa arimasu ka | 有英文菜單嗎？ |
| 書いてもらえますか | kaite moraemasu ka | 可以幫我寫下來嗎？ |

### restaurant 餐廳
| jp | romaji | zh |
|---|---|---|
| ★四名です | yon-mei desu | 我們四個人 |
| 予約はしていません | yoyaku wa shite imasen | 沒有訂位 |
| ★おすすめは何ですか | osusume wa nan desu ka | 你推薦什麼？ |
| ★これをください | kore o kudasai | 我要這個（指菜單） |
| とりあえず、生ビールをください | toriaezu, nama bīru o kudasai | 先來杯生啤酒 |
| 〜はアレルギーがあります | 〜 wa arerugī ga arimasu | 我對〜過敏 |
| 〜は食べられません | 〜 wa taberaremasen | 我不能吃〜 |
| これは何のお肉ですか | kore wa nan no oniku desu ka | 這是什麼肉？ |
| ★お会計お願いします | okaikei onegai shimasu | 麻煩結帳 |
| ★カードは使えますか | kādo wa tsukaemasu ka | 可以刷卡嗎？ |
| ごちそうさまでした | gochisōsama deshita | 謝謝招待（離開時） |
| 持ち帰りできますか | mochikaeri dekimasu ka | 可以外帶嗎？ |
| お水をください | omizu o kudasai | 請給我水 |

vocab：卵（蛋）、牛乳（奶）、小麦（小麥）、そば（蕎麥）、食券（餐券）、券売機（食券機）。

### shopping 購物
| jp | romaji | zh |
|---|---|---|
| 〜を探しています | 〜 o sagashite imasu | 我在找〜 |
| ★試着してもいいですか | shichaku shite mo ii desu ka | 可以試穿嗎？ |
| Mサイズはありますか | emu saizu wa arimasu ka | 有 M 號嗎？ |
| もう少し大きいサイズはありますか | mō sukoshi ōkii saizu wa arimasu ka | 有大一點的嗎？ |
| 別の色はありますか | betsu no iro wa arimasu ka | 有別的顏色嗎？ |
| 税込みですか | zeikomi desu ka | 是含稅價嗎？ |
| ★免税でお願いします | menzei de onegai shimasu | 我要辦免稅 |
| パスポートはこちらです | pasupōto wa kochira desu | 這是我的護照 |
| 袋をください | fukuro o kudasai | 請給我袋子 |
| これだけです | kore dake desu | 只買這些 |

### transport 交通
| jp | romaji | zh |
|---|---|---|
| ★〜駅はどこですか | 〜 eki wa doko desu ka | 〜車站在哪？ |
| ★この電車は〜に行きますか | kono densha wa 〜 ni ikimasu ka | 這班車有到〜嗎？ |
| ★〜に行きたいです | 〜 ni ikitai desu | 我想去〜 |
| 何番線ですか | nan-ban-sen desu ka | 幾號月台？ |
| 乗り換えはどこですか | norikae wa doko desu ka | 在哪轉乘？ |
| ICカードにチャージしたいです | IC kādo ni chāji shitai desu | 我想儲值 IC 卡 |
| 切符はどこで買えますか | kippu wa doko de kaemasu ka | 在哪買票？ |
| 〜までお願いします | 〜 made onegai shimasu | （計程車）請到〜 |
| ここで降ります | koko de orimasu | 我在這裡下車 |

### hotel 飯店
| jp | romaji | zh |
|---|---|---|
| ★〜の名前で予約しています | 〜 no namae de yoyaku shite imasu | 用〜的名字訂房 |
| ★チェックインお願いします | chekku in onegai shimasu | 我要辦入住 |
| ★荷物を預かっていただけますか | nimotsu o azukatte itadakemasu ka | 可以寄放行李嗎？ |
| 朝食は何時からですか | chōshoku wa nan-ji kara desu ka | 早餐幾點開始？ |
| Wi-Fiのパスワードを教えてください | Wi-Fi no pasuwādo o oshiete kudasai | 請告訴我 Wi-Fi 密碼 |
| タオルをもう一枚いただけますか | taoru o mō ichi-mai itadakemasu ka | 再給我一條毛巾好嗎？ |
| チェックアウトは何時ですか | chekku auto wa nan-ji desu ka | 退房幾點？ |

### kanji 招牌閱讀（type: kanji，出題格式：大字漢字 → 4 選 1 中文）
改札（剪票口）、出口、入口、精算（補票）、精算機、乗り換え（轉乘）、券売機（售票機）、〜番線（〜號線）、割引（折扣）、税込（含稅）、税抜（未稅）、両替（換錢）、免税、営業中、準備中（未開店）、使用中、禁煙、立入禁止（禁止進入）、お手洗い（洗手間）、会計（結帳處）、売切れ（售完）、半額（半價）、北口/南口/東口/西口、無料（免費）、有料（付費）。
★高頻：改札、出口、精算、税込、免税、お手洗い、売切れ、乗り換え。

### 情境對話腳本（scenario dialogues，至少實作以下 4 組）

**餐廳（一般店）**：店員「いらっしゃいませ。何名様ですか？」→ 提示「說：四個人」→ 答案「四名です」→ 店員帶位 → 提示「呼喚店員並問推薦」→「すみません、おすすめは何ですか」→ 提示「指著菜單點餐」→「これをください」→ 用餐後 → 提示「結帳並問能否刷卡」→「お会計お願いします。カードは使えますか」→ 離開時 →「ごちそうさまでした」。

**餐廳分支（食券機）**：說明食券機流程（投錢→按鈕→取券→交店員），提示「看不懂按鈕，請店員推薦」→「すみません、おすすめを教えてください」。

**交通**：迷路 → 提示「問路人新宿車站在哪」→「すみません、新宿駅はどこですか」→ 到站 → 提示「問站務員這班車到淺草嗎」→「この電車は浅草に行きますか」→ 站務員「いいえ、次のホームです」→ 提示「聽不懂，請對方再說一次」→「もう一度お願いします」。

**購物退稅**：提示「問店員含稅嗎」→「税込みですか」→ 提示「說要辦免稅並出示護照」→「免税でお願いします。パスポートはこちらです」。

**飯店**：櫃檯「いらっしゃいませ」→ 提示「說用『陳』的名字訂房、要 check-in」→「陳の名前で予約しています。チェックインお願いします」→ 提示「問早餐幾點」→「朝食は何時からですか」→ 提示「請對方寄放行李」→「荷物を預かっていただけますか」。

## 驗收標準（Checklist）

- [ ] 首次開啟進入診斷模式；診斷後才解鎖每日課程。
- [ ] 每日課程 5 段流程可完整跑完並記錄完成。
- [ ] SRS 排程符合上方演算法（含衝刺上限）；quality<3 的卡隔天必再出現。
- [ ] 關掉瀏覽器重開，所有進度保留（localStorage）。
- [ ] 匯出/匯入 JSON 備份可用。
- [ ] Day 22 後（或剩餘天數 ≤6）解鎖「一日東京」模擬。
- [ ] 手機 375px 寬度下 UI 正常、按鈕好按。
- [ ] streak 與補簽卡邏輯正確（跨日判定以本地時區為準）。
- [ ] 漢字卡字級 ≥48px；答錯自動入 SRS。
- [ ] 全介面繁體中文，無教科書式密集排版。
