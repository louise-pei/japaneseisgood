/* ==========================================================================
   東京旅遊日語 30 天衝刺 — 內容資料庫
   欄位格式：[jp, kana, romaji, zh, star]
   star = 1 代表高頻卡（Day 28–30 精煉用）
   ========================================================================== */

const TRIP_DATE = new Date(2026, 7, 27, 0, 0, 0, 0).getTime(); // 2026-08-27

const SCENARIOS = {
  basics:     { name: '基礎萬用', emoji: '🌸', color: '#FF5A5F' },
  repair:     { name: '修復策略', emoji: '🛟', color: '#F5A623' },
  restaurant: { name: '餐廳',     emoji: '🍜', color: '#E8503A' },
  shopping:   { name: '購物',     emoji: '🛍️', color: '#C86FC9' },
  transport:  { name: '交通',     emoji: '🚃', color: '#2E86AB' },
  hotel:      { name: '飯店',     emoji: '🏨', color: '#3AA76D' },
  kanji:      { name: '招牌漢字', emoji: '🈶', color: '#6B5B95' }
};

/* 首頁六大情境環（basics 與 repair 合併顯示為「基礎萬用」） */
const SCENARIO_GROUPS = [
  { key: 'basics',     label: '基礎萬用', emoji: '🌸', members: ['basics', 'repair'] },
  { key: 'restaurant', label: '餐廳',     emoji: '🍜', members: ['restaurant'] },
  { key: 'shopping',   label: '購物',     emoji: '🛍️', members: ['shopping'] },
  { key: 'transport',  label: '交通',     emoji: '🚃', members: ['transport'] },
  { key: 'hotel',      label: '飯店',     emoji: '🏨', members: ['hotel'] },
  { key: 'kanji',      label: '招牌漢字', emoji: '🈶', members: ['kanji'] }
];

const RAW_CARDS = {
  /* ---------------- basics 基礎萬用 ---------------- */
  basics: {
    phrase: [
      ['すみません', 'すみません', 'sumimasen', '不好意思／借過／呼喚店員（萬用）', 1],
      ['ありがとうございます', 'ありがとうございます', 'arigatō gozaimasu', '謝謝', 1],
      ['お願いします', 'おねがいします', 'onegai shimasu', '麻煩你了', 1],
      ['〜をください', '〜をください', '〜 o kudasai', '請給我〜', 1],
      ['〜てもいいですか', '〜てもいいですか', '〜te mo ii desu ka', '我可以〜嗎？', 1],
      ['〜はどこですか', '〜はどこですか', '〜 wa doko desu ka', '〜在哪裡？', 1],
      ['〜はありますか', '〜はありますか', '〜 wa arimasu ka', '有〜嗎？', 1],
      ['いくらですか', 'いくらですか', 'ikura desu ka', '多少錢？', 1],
      ['大丈夫です', 'だいじょうぶです', 'daijōbu desu', '沒關係／不用了', 0],
      ['結構です', 'けっこうです', 'kekkō desu', '不用了（婉拒）', 0],
      ['おはようございます', 'おはようございます', 'ohayō gozaimasu', '早安', 0],
      ['こんにちは', 'こんにちは', 'konnichiwa', '你好（白天）', 0],
      ['こんばんは', 'こんばんは', 'konbanwa', '晚上好', 0]
    ],
    vocab: [
      ['一', 'いち', 'ichi', '1', 1],
      ['二', 'に', 'ni', '2', 1],
      ['三', 'さん', 'san', '3', 1],
      ['四', 'よん', 'yon', '4', 1],
      ['五', 'ご', 'go', '5', 1],
      ['六', 'ろく', 'roku', '6', 0],
      ['七', 'なな', 'nana', '7', 0],
      ['八', 'はち', 'hachi', '8', 0],
      ['九', 'きゅう', 'kyū', '9', 0],
      ['十', 'じゅう', 'jū', '10', 0],
      ['一つ', 'ひとつ', 'hitotsu', '一個', 1],
      ['二つ', 'ふたつ', 'futatsu', '兩個', 1],
      ['三つ', 'みっつ', 'mittsu', '三個', 0],
      ['一人', 'ひとり', 'hitori', '一個人', 1],
      ['二人', 'ふたり', 'futari', '兩個人', 1],
      ['三人', 'さんにん', 'san-nin', '三個人', 0],
      ['〜枚', '〜まい', '〜mai', '〜張（票、薄片狀的東西）', 0],
      ['〜本', '〜ほん', '〜hon', '〜瓶（細長的東西）', 0],
      ['〜杯', '〜はい', '〜hai', '〜杯', 0],
      ['〜時', '〜じ', '〜ji', '〜點（鐘）', 1],
      ['〜分', '〜ふん', '〜fun', '〜分', 0],
      ['今日', 'きょう', 'kyō', '今天', 0],
      ['明日', 'あした', 'ashita', '明天', 0]
    ]
  },

  /* ---------------- repair 修復策略（全部高頻） ---------------- */
  repair: {
    phrase: [
      ['もう一度お願いします', 'もういちどおねがいします', 'mō ichido onegai shimasu', '請再說一次', 1],
      ['ゆっくり話してください', 'ゆっくりはなしてください', 'yukkuri hanashite kudasai', '請說慢一點', 1],
      ['すみません、わかりません', 'すみません、わかりません', 'sumimasen, wakarimasen', '不好意思，我聽不懂', 1],
      ['日本語が少しだけわかります', 'にほんごがすこしだけわかります', 'nihongo ga sukoshi dake wakarimasu', '我只懂一點日語', 1],
      ['ここがわかりません', 'ここがわかりません', 'koko ga wakarimasen', '我不懂這個部分（指著）', 1],
      ['英語のメニューはありますか', 'えいごのメニューはありますか', 'eigo no menyū wa arimasu ka', '有英文菜單嗎？', 1],
      ['書いてもらえますか', 'かいてもらえますか', 'kaite moraemasu ka', '可以幫我寫下來嗎？', 1]
    ]
  },

  /* ---------------- restaurant 餐廳 ---------------- */
  restaurant: {
    phrase: [
      ['四名です', 'よんめいです', 'yon-mei desu', '我們四個人', 1],
      ['予約はしていません', 'よやくはしていません', 'yoyaku wa shite imasen', '沒有訂位', 0],
      ['おすすめは何ですか', 'おすすめはなんですか', 'osusume wa nan desu ka', '你推薦什麼？', 1],
      ['これをください', 'これをください', 'kore o kudasai', '我要這個（指菜單）', 1],
      ['とりあえず、生ビールをください', 'とりあえず、なまビールをください', 'toriaezu, nama bīru o kudasai', '先來杯生啤酒', 0],
      ['〜はアレルギーがあります', '〜はアレルギーがあります', '〜 wa arerugī ga arimasu', '我對〜過敏', 0],
      ['〜は食べられません', '〜はたべられません', '〜 wa taberaremasen', '我不能吃〜', 0],
      ['これは何のお肉ですか', 'これはなんのおにくですか', 'kore wa nan no oniku desu ka', '這是什麼肉？', 0],
      ['お会計お願いします', 'おかいけいおねがいします', 'okaikei onegai shimasu', '麻煩結帳', 1],
      ['カードは使えますか', 'カードはつかえますか', 'kādo wa tsukaemasu ka', '可以刷卡嗎？', 1],
      ['ごちそうさまでした', 'ごちそうさまでした', 'gochisōsama deshita', '謝謝招待（離開時）', 0],
      ['持ち帰りできますか', 'もちかえりできますか', 'mochikaeri dekimasu ka', '可以外帶嗎？', 0],
      ['お水をください', 'おみずをください', 'omizu o kudasai', '請給我水', 0]
    ],
    vocab: [
      ['卵', 'たまご', 'tamago', '蛋', 0],
      ['牛乳', 'ぎゅうにゅう', 'gyūnyū', '牛奶', 0],
      ['小麦', 'こむぎ', 'komugi', '小麥', 0],
      ['そば', 'そば', 'soba', '蕎麥（麵）', 0],
      ['食券', 'しょっけん', 'shokken', '餐券', 0],
      ['券売機', 'けんばいき', 'kenbaiki', '食券機（售票機）', 0]
    ]
  },

  /* ---------------- shopping 購物 ---------------- */
  shopping: {
    phrase: [
      ['〜を探しています', '〜をさがしています', '〜 o sagashite imasu', '我在找〜', 0],
      ['試着してもいいですか', 'しちゃくしてもいいですか', 'shichaku shite mo ii desu ka', '可以試穿嗎？', 1],
      ['Mサイズはありますか', 'エムサイズはありますか', 'emu saizu wa arimasu ka', '有 M 號嗎？', 0],
      ['もう少し大きいサイズはありますか', 'もうすこしおおきいサイズはありますか', 'mō sukoshi ōkii saizu wa arimasu ka', '有大一點的嗎？', 0],
      ['別の色はありますか', 'べつのいろはありますか', 'betsu no iro wa arimasu ka', '有別的顏色嗎？', 0],
      ['税込みですか', 'ぜいこみですか', 'zeikomi desu ka', '是含稅價嗎？', 0],
      ['免税でお願いします', 'めんぜいでおねがいします', 'menzei de onegai shimasu', '我要辦免稅', 1],
      ['パスポートはこちらです', 'パスポートはこちらです', 'pasupōto wa kochira desu', '這是我的護照', 0],
      ['袋をください', 'ふくろをください', 'fukuro o kudasai', '請給我袋子', 0],
      ['これだけです', 'これだけです', 'kore dake desu', '只買這些', 0]
    ]
  },

  /* ---------------- transport 交通 ---------------- */
  transport: {
    phrase: [
      ['〜駅はどこですか', '〜えきはどこですか', '〜 eki wa doko desu ka', '〜車站在哪？', 1],
      ['この電車は〜に行きますか', 'このでんしゃは〜にいきますか', 'kono densha wa 〜 ni ikimasu ka', '這班車有到〜嗎？', 1],
      ['〜に行きたいです', '〜にいきたいです', '〜 ni ikitai desu', '我想去〜', 1],
      ['何番線ですか', 'なんばんせんですか', 'nan-ban-sen desu ka', '幾號月台？', 0],
      ['乗り換えはどこですか', 'のりかえはどこですか', 'norikae wa doko desu ka', '在哪轉乘？', 0],
      ['ICカードにチャージしたいです', 'アイシーカードにチャージしたいです', 'IC kādo ni chāji shitai desu', '我想儲值 IC 卡', 0],
      ['切符はどこで買えますか', 'きっぷはどこでかえますか', 'kippu wa doko de kaemasu ka', '在哪買票？', 0],
      ['〜までお願いします', '〜までおねがいします', '〜 made onegai shimasu', '（計程車）請到〜', 0],
      ['ここで降ります', 'ここでおります', 'koko de orimasu', '我在這裡下車', 0]
    ]
  },

  /* ---------------- hotel 飯店 ---------------- */
  hotel: {
    phrase: [
      ['〜の名前で予約しています', '〜のなまえでよやくしています', '〜 no namae de yoyaku shite imasu', '用〜的名字訂房', 1],
      ['チェックインお願いします', 'チェックインおねがいします', 'chekku in onegai shimasu', '我要辦入住', 1],
      ['荷物を預かっていただけますか', 'にもつをあずかっていただけますか', 'nimotsu o azukatte itadakemasu ka', '可以寄放行李嗎？', 1],
      ['朝食は何時からですか', 'ちょうしょくはなんじからですか', 'chōshoku wa nan-ji kara desu ka', '早餐幾點開始？', 0],
      ['Wi-Fiのパスワードを教えてください', 'ワイファイのパスワードをおしえてください', 'Wi-Fi no pasuwādo o oshiete kudasai', '請告訴我 Wi-Fi 密碼', 0],
      ['タオルをもう一枚いただけますか', 'タオルをもういちまいいただけますか', 'taoru o mō ichi-mai itadakemasu ka', '再給我一條毛巾好嗎？', 0],
      ['チェックアウトは何時ですか', 'チェックアウトはなんじですか', 'chekku auto wa nan-ji desu ka', '退房幾點？', 0]
    ]
  },

  /* ---------------- kanji 招牌閱讀 ---------------- */
  kanji: {
    kanji: [
      ['改札', 'かいさつ', 'kaisatsu', '剪票口', 1],
      ['出口', 'でぐち', 'deguchi', '出口', 0],
      ['入口', 'いりぐち', 'iriguchi', '入口', 0],
      ['精算', 'せいさん', 'seisan', '補票（補繳車資）', 1],
      ['精算機', 'せいさんき', 'seisanki', '補票機', 0],
      ['乗り換え', 'のりかえ', 'norikae', '轉乘', 1],
      ['券売機', 'けんばいき', 'kenbaiki', '售票機', 0],
      ['〜番線', '〜ばんせん', '〜bansen', '〜號月台', 0],
      ['割引', 'わりびき', 'waribiki', '折扣', 0],
      ['税込', 'ぜいこみ', 'zeikomi', '含稅', 1],
      ['税抜', 'ぜいぬき', 'zeinuki', '未稅', 0],
      ['両替', 'りょうがえ', 'ryōgae', '換錢', 0],
      ['免税', 'めんぜい', 'menzei', '免稅', 1],
      ['営業中', 'えいぎょうちゅう', 'eigyōchū', '營業中', 0],
      ['準備中', 'じゅんびちゅう', 'junbichū', '準備中（尚未開店）', 0],
      ['使用中', 'しようちゅう', 'shiyōchū', '使用中', 0],
      ['禁煙', 'きんえん', "kin'en", '禁菸', 0],
      ['立入禁止', 'たちいりきんし', 'tachiiri kinshi', '禁止進入', 0],
      ['お手洗い', 'おてあらい', 'otearai', '洗手間', 1],
      ['会計', 'かいけい', 'kaikei', '結帳處', 0],
      ['売切れ', 'うりきれ', 'urikire', '售完', 1],
      ['半額', 'はんがく', 'hangaku', '半價', 0],
      ['北口', 'きたぐち', 'kitaguchi', '北出口', 0],
      ['南口', 'みなみぐち', 'minamiguchi', '南出口', 0],
      ['東口', 'ひがしぐち', 'higashiguchi', '東出口', 0],
      ['西口', 'にしぐち', 'nishiguchi', '西出口', 0],
      ['無料', 'むりょう', 'muryō', '免費', 0],
      ['有料', 'ゆうりょう', 'yūryō', '付費（收費）', 0]
    ]
  }
};

/* 攤平成卡片陣列（id 穩定，供 localStorage 對應） */
const CARDS = (function () {
  const out = [];
  Object.keys(RAW_CARDS).forEach(scenario => {
    Object.keys(RAW_CARDS[scenario]).forEach(type => {
      RAW_CARDS[scenario][type].forEach((row, i) => {
        out.push({
          id: scenario + '-' + type + '-' + i,
          jp: row[0], kana: row[1], romaji: row[2], zh: row[3],
          star: !!row[4], scenario: scenario, type: type
        });
      });
    });
  });
  return out;
})();

const CARD_BY_ID = CARDS.reduce((m, c) => (m[c.id] = c, m), {});
const CARD_BY_JP = CARDS.reduce((m, c) => (m[c.jp] = c, m), {});

/* ==========================================================================
   情境對話腳本
   step: { narration?, npc?{jp,kana,zh}, prompt, answer{jp,kana,romaji}, tip? }
   ========================================================================== */

const DIALOGUES = [
  {
    id: 'rest_normal',
    scenario: 'restaurant',
    title: '餐廳・一般點餐',
    emoji: '🍶',
    intro: '晚上七點，你帶著家人推開一家居酒屋的暖簾。',
    steps: [
      {
        npc: { jp: 'いらっしゃいませ。何名様ですか？', kana: 'いらっしゃいませ。なんめいさまですか？', zh: '歡迎光臨，請問幾位？' },
        prompt: '說：我們四個人',
        answer: { jp: '四名です', kana: 'よんめいです', romaji: 'yon-mei desu' }
      },
      {
        npc: { jp: 'ご予約はされていますか？', kana: 'ごよやくはされていますか？', zh: '請問有訂位嗎？' },
        prompt: '說：沒有訂位',
        answer: { jp: '予約はしていません', kana: 'よやくはしていません', romaji: 'yoyaku wa shite imasen' }
      },
      {
        narration: '店員帶你們到窗邊的位子坐下，遞上菜單就走開了。菜單全是日文。',
        prompt: '呼喚店員，並問他推薦什麼',
        answer: { jp: 'すみません、おすすめは何ですか', kana: 'すみません、おすすめはなんですか', romaji: 'sumimasen, osusume wa nan desu ka' },
        tip: '「すみません」在店裡就是「不好意思、這邊」的呼喚用法，大聲說沒關係。'
      },
      {
        npc: { jp: '本日は鶏の唐揚げがおすすめです。', kana: 'ほんじつはとりのからあげがおすすめです。', zh: '今天推薦炸雞塊。' },
        prompt: '指著菜單說：我要這個',
        answer: { jp: 'これをください', kana: 'これをください', romaji: 'kore o kudasai' }
      },
      {
        npc: { jp: 'お飲み物はいかがですか？', kana: 'おのみものはいかがですか？', zh: '飲料要來點什麼嗎？' },
        prompt: '說：先來杯生啤酒',
        answer: { jp: 'とりあえず、生ビールをください', kana: 'とりあえず、なまビールをください', romaji: 'toriaezu, nama bīru o kudasai' }
      },
      {
        narration: '菜上桌了。有一道看起來像肉，但你不確定是什麼。',
        prompt: '問店員：這是什麼肉？',
        answer: { jp: 'これは何のお肉ですか', kana: 'これはなんのおにくですか', romaji: 'kore wa nan no oniku desu ka' }
      },
      {
        narration: '大家吃飽了，該結帳了。',
        prompt: '說：麻煩結帳，可以刷卡嗎？',
        answer: { jp: 'お会計お願いします。カードは使えますか', kana: 'おかいけいおねがいします。カードはつかえますか', romaji: 'okaikei onegai shimasu. kādo wa tsukaemasu ka' }
      },
      {
        narration: '結完帳，準備離開。',
        prompt: '離開時對店員說一句',
        answer: { jp: 'ごちそうさまでした', kana: 'ごちそうさまでした', romaji: 'gochisōsama deshita' },
        tip: '這句是「謝謝招待」，日本人離開餐廳幾乎一定會說。說了印象分直接加滿。'
      }
    ]
  },

  {
    id: 'rest_ticket',
    scenario: 'restaurant',
    title: '餐廳・食券機拉麵店',
    emoji: '🎫',
    intro: '中午，你走進一家拉麵店。門口一台亮著燈的機器擋在前面 —— 食券機。',
    steps: [
      {
        narration: '食券機流程：① 先投錢（紙鈔或硬幣）② 按下想吃的餐點按鈕 ③ 機器吐出餐券 ④ 把餐券交給店員。座位坐下後把券放在檯面上即可。',
        prompt: '按鈕全是漢字看不懂。呼喚店員，請他推薦',
        answer: { jp: 'すみません、おすすめを教えてください', kana: 'すみません、おすすめをおしえてください', romaji: 'sumimasen, osusume o oshiete kudasai' }
      },
      {
        npc: { jp: '一番人気はこの醤油ラーメンですよ。', kana: 'いちばんにんきはこのしょうゆラーメンですよ。', zh: '最受歡迎的是這個醬油拉麵喔。' },
        prompt: '他講得有點快，請他再說一次',
        answer: { jp: 'もう一度お願いします', kana: 'もういちどおねがいします', romaji: 'mō ichido onegai shimasu' }
      },
      {
        narration: '你按下按鈕，機器吐出一張餐券。你坐下把券交給店員。',
        prompt: '你對小麥過敏，告訴店員',
        answer: { jp: '小麦はアレルギーがあります', kana: 'こむぎはアレルギーがあります', romaji: 'komugi wa arerugī ga arimasu' },
        tip: '把「小麦」換成 卵（たまご）、牛乳（ぎゅうにゅう）、そば 都通用。'
      },
      {
        narration: '拉麵上桌，湯頭很香。吃完後你想帶一份餃子回飯店。',
        prompt: '問：可以外帶嗎？',
        answer: { jp: '持ち帰りできますか', kana: 'もちかえりできますか', romaji: 'mochikaeri dekimasu ka' }
      }
    ]
  },

  {
    id: 'transport_lost',
    scenario: 'transport',
    title: '交通・問路與月台',
    emoji: '🚉',
    intro: '你手上拿著手機，但地下街訊號很差。家人在後面等你決定往哪走。',
    steps: [
      {
        narration: '前方有位看起來不趕時間的上班族。',
        prompt: '叫住他，問新宿車站在哪裡',
        answer: { jp: 'すみません、新宿駅はどこですか', kana: 'すみません、しんじゅくえきはどこですか', romaji: 'sumimasen, shinjuku eki wa doko desu ka' }
      },
      {
        npc: { jp: 'あの階段を上がって、右です。', kana: 'あのかいだんをあがって、みぎです。', zh: '上那個樓梯，然後右轉。' },
        prompt: '道謝',
        answer: { jp: 'ありがとうございます', kana: 'ありがとうございます', romaji: 'arigatō gozaimasu' }
      },
      {
        narration: '你走到月台，但不確定這班車對不對。旁邊站著站務員。',
        prompt: '問站務員：這班車有到淺草嗎？',
        answer: { jp: 'この電車は浅草に行きますか', kana: 'このでんしゃはあさくさにいきますか', romaji: 'kono densha wa asakusa ni ikimasu ka' }
      },
      {
        npc: { jp: 'いいえ、次のホームです。', kana: 'いいえ、つぎのホームです。', zh: '不是，是下一個月台。' },
        prompt: '你沒聽清楚，請他再說一次',
        answer: { jp: 'もう一度お願いします', kana: 'もういちどおねがいします', romaji: 'mō ichido onegai shimasu' }
      },
      {
        npc: { jp: '次のホームですよ。三番線です。', kana: 'つぎのホームですよ。さんばんせんです。', zh: '是下一個月台喔，三號月台。' },
        prompt: '再確認一次：幾號月台？',
        answer: { jp: '何番線ですか', kana: 'なんばんせんですか', romaji: 'nan-ban-sen desu ka' }
      },
      {
        narration: '你的 IC 卡餘額不足，被閘門擋下來了。',
        prompt: '跟站務員說：我想儲值 IC 卡',
        answer: { jp: 'ICカードにチャージしたいです', kana: 'アイシーカードにチャージしたいです', romaji: 'IC kādo ni chāji shitai desu' },
        tip: '若是紙票不足額，找「精算機」補票即可。'
      }
    ]
  },

  {
    id: 'shopping_tax',
    scenario: 'shopping',
    title: '購物・試穿與退稅',
    emoji: '🧾',
    intro: '藥妝店二樓的服飾區，你看上一件外套。',
    steps: [
      {
        prompt: '問店員：可以試穿嗎？',
        answer: { jp: '試着してもいいですか', kana: 'しちゃくしてもいいですか', romaji: 'shichaku shite mo ii desu ka' }
      },
      {
        npc: { jp: 'はい、どうぞ。こちらです。', kana: 'はい、どうぞ。こちらです。', zh: '好的，請。這邊請。' },
        prompt: '有點緊。問：有大一點的嗎？',
        answer: { jp: 'もう少し大きいサイズはありますか', kana: 'もうすこしおおきいサイズはありますか', romaji: 'mō sukoshi ōkii saizu wa arimasu ka' }
      },
      {
        narration: '換了尺寸剛好。你走到櫃檯，看到標價 12,000。',
        prompt: '問店員：這是含稅價嗎？',
        answer: { jp: '税込みですか', kana: 'ぜいこみですか', romaji: 'zeikomi desu ka' }
      },
      {
        npc: { jp: '税抜きの価格です。', kana: 'ぜいぬきのかかくです。', zh: '這是未稅價格。' },
        prompt: '說你要辦免稅，並把護照拿出來',
        answer: { jp: '免税でお願いします。パスポートはこちらです', kana: 'めんぜいでおねがいします。パスポートはこちらです', romaji: 'menzei de onegai shimasu. pasupōto wa kochira desu' },
        tip: '免稅需本人護照正本，且商品當日同店滿 5,000 日圓（未稅）。'
      },
      {
        npc: { jp: '袋はご利用になりますか？', kana: 'ふくろはごりようになりますか？', zh: '需要袋子嗎？' },
        prompt: '說：請給我袋子',
        answer: { jp: '袋をください', kana: 'ふくろをください', romaji: 'fukuro o kudasai' }
      }
    ]
  },

  {
    id: 'hotel_checkin',
    scenario: 'hotel',
    title: '飯店・入住與寄行李',
    emoji: '🛎️',
    intro: '下午一點，離 check-in 時間還有兩小時，但你們拖著四個行李箱。',
    steps: [
      {
        npc: { jp: 'いらっしゃいませ。', kana: 'いらっしゃいませ。', zh: '歡迎光臨。' },
        prompt: '說：用「陳」的名字訂房，要辦入住',
        answer: { jp: '陳の名前で予約しています。チェックインお願いします', kana: 'ちんのなまえでよやくしています。チェックインおねがいします', romaji: 'chin no namae de yoyaku shite imasu. chekku in onegai shimasu' }
      },
      {
        npc: { jp: '申し訳ございません、チェックインは三時からです。', kana: 'もうしわけございません、チェックインはさんじからです。', zh: '很抱歉，入住是三點開始。' },
        prompt: '請對方幫忙寄放行李',
        answer: { jp: '荷物を預かっていただけますか', kana: 'にもつをあずかっていただけますか', romaji: 'nimotsu o azukatte itadakemasu ka' }
      },
      {
        npc: { jp: 'はい、お預かりいたします。', kana: 'はい、おあずかりいたします。', zh: '好的，我們幫您保管。' },
        prompt: '問：早餐幾點開始？',
        answer: { jp: '朝食は何時からですか', kana: 'ちょうしょくはなんじからですか', romaji: 'chōshoku wa nan-ji kara desu ka' }
      },
      {
        narration: '三點你回到飯店，順利拿到房卡。進房後想連 Wi-Fi。',
        prompt: '請櫃檯告訴你 Wi-Fi 密碼',
        answer: { jp: 'Wi-Fiのパスワードを教えてください', kana: 'ワイファイのパスワードをおしえてください', romaji: 'Wi-Fi no pasuwādo o oshiete kudasai' }
      },
      {
        narration: '房間裡毛巾少了一條。',
        prompt: '打電話到櫃檯：再給我一條毛巾好嗎？',
        answer: { jp: 'タオルをもう一枚いただけますか', kana: 'タオルをもういちまいいただけますか', romaji: 'taoru o mō ichi-mai itadakemasu ka' }
      },
      {
        prompt: '最後確認：退房幾點？',
        answer: { jp: 'チェックアウトは何時ですか', kana: 'チェックアウトはなんじですか', romaji: 'chekku auto wa nan-ji desu ka' }
      }
    ]
  }
];

const DIALOGUE_BY_ID = DIALOGUES.reduce((m, d) => (m[d.id] = d, m), {});

/* ==========================================================================
   「一日東京」交錯模擬（Day 22 後解鎖）
   ========================================================================== */

const TOKYO_DAY = {
  id: 'tokyo',
  title: '一日東京',
  emoji: '🗼',
  stations: [
    {
      place: '① 成田機場・車站櫃檯',
      emoji: '🛬',
      narration: '飛機落地，你們拖著行李來到車站。第一件事：幫全家買 Suica。',
      steps: [
        { prompt: '說：請給我 Suica 卡（用「〜をください」）', answer: { jp: 'スイカをください', kana: 'スイカをください', romaji: 'Suika o kudasai' } },
        { prompt: '說：四張，麻煩你了', answer: { jp: '四枚お願いします', kana: 'よんまいおねがいします', romaji: 'yon-mai onegai shimasu' } },
        { npc: { jp: '一枚二千円になります。', kana: 'いちまいにせんえんになります。', zh: '一張兩千日圓。' }, prompt: '問：（全部）多少錢？', answer: { jp: '全部でいくらですか', kana: 'ぜんぶでいくらですか', romaji: 'zenbu de ikura desu ka' } }
      ]
    },
    {
      place: '② 月台',
      emoji: '🚃',
      narration: '你們刷卡進站，但月台有兩個方向。',
      steps: [
        { prompt: '問站務員：這班車有到上野嗎？', answer: { jp: 'この電車は上野に行きますか', kana: 'このでんしゃはうえのにいきますか', romaji: 'kono densha wa ueno ni ikimasu ka' } },
        { npc: { jp: 'いいえ、六番線です。', kana: 'いいえ、ろくばんせんです。', zh: '不是，是六號月台。' }, prompt: '沒聽清楚，請他說慢一點', answer: { jp: 'ゆっくり話してください', kana: 'ゆっくりはなしてください', romaji: 'yukkuri hanashite kudasai' } }
      ]
    },
    {
      place: '③ 飯店櫃檯（寄行李）',
      emoji: '🏨',
      narration: '中午抵達飯店，離 check-in 還有三小時。',
      steps: [
        { prompt: '說：用「陳」的名字訂房', answer: { jp: '陳の名前で予約しています', kana: 'ちんのなまえでよやくしています', romaji: 'chin no namae de yoyaku shite imasu' } },
        { prompt: '請他們幫忙寄放行李', answer: { jp: '荷物を預かっていただけますか', kana: 'にもつをあずかっていただけますか', romaji: 'nimotsu o azukatte itadakemasu ka' } }
      ]
    },
    {
      place: '④ 食券機拉麵店',
      emoji: '🍜',
      narration: '肚子餓了。巷口一家拉麵店門口有台食券機。',
      steps: [
        { prompt: '按鈕看不懂，請店員推薦', answer: { jp: 'すみません、おすすめを教えてください', kana: 'すみません、おすすめをおしえてください', romaji: 'sumimasen, osusume o oshiete kudasai' } },
        { prompt: '孩子對蛋過敏，告訴店員', answer: { jp: '卵はアレルギーがあります', kana: 'たまごはアレルギーがあります', romaji: 'tamago wa arerugī ga arimasu' } },
        { prompt: '吃完離開時說一句', answer: { jp: 'ごちそうさまでした', kana: 'ごちそうさまでした', romaji: 'gochisōsama deshita' } }
      ]
    },
    {
      place: '⑤ 藥妝店・退稅',
      emoji: '🛍️',
      narration: '下午的藥妝店擠滿了人，你抱著一堆東西走到櫃檯。',
      steps: [
        { prompt: '說：只買這些', answer: { jp: 'これだけです', kana: 'これだけです', romaji: 'kore dake desu' } },
        { prompt: '問：這是含稅價嗎？', answer: { jp: '税込みですか', kana: 'ぜいこみですか', romaji: 'zeikomi desu ka' } },
        { prompt: '說你要辦免稅，並出示護照', answer: { jp: '免税でお願いします。パスポートはこちらです', kana: 'めんぜいでおねがいします。パスポートはこちらです', romaji: 'menzei de onegai shimasu. pasupōto wa kochira desu' } }
      ]
    },
    {
      place: '⑥ 迷路了',
      emoji: '🧭',
      narration: '走出藥妝店，天黑了，Google Map 定位一直漂移。',
      steps: [
        { prompt: '叫住路人，說你只懂一點日語', answer: { jp: 'すみません、日本語が少しだけわかります', kana: 'すみません、にほんごがすこしだけわかります', romaji: 'sumimasen, nihongo ga sukoshi dake wakarimasu' } },
        { prompt: '把手機拿給他看，說：我想去這裡', answer: { jp: 'ここに行きたいです', kana: 'ここにいきたいです', romaji: 'koko ni ikitai desu' } },
        { npc: { jp: 'この道をまっすぐ行って、二つ目の角を左です。', kana: 'このみちをまっすぐいって、ふたつめのかどをひだりです。', zh: '這條路直走，第二個轉角左轉。' }, prompt: '太複雜了，請他幫你寫下來', answer: { jp: '書いてもらえますか', kana: 'かいてもらえますか', romaji: 'kaite moraemasu ka' } }
      ]
    },
    {
      place: '⑦ 回飯店 check-in',
      emoji: '🛎️',
      narration: '終於回到飯店。櫃檯人員朝你微笑。',
      steps: [
        { prompt: '說：我要辦入住', answer: { jp: 'チェックインお願いします', kana: 'チェックインおねがいします', romaji: 'chekku in onegai shimasu' } },
        { prompt: '問：早餐幾點開始？', answer: { jp: '朝食は何時からですか', kana: 'ちょうしょくはなんじからですか', romaji: 'chōshoku wa nan-ji kara desu ka' } },
        { prompt: '拿到房卡，道謝', answer: { jp: 'ありがとうございます', kana: 'ありがとうございます', romaji: 'arigatō gozaimasu' } }
      ]
    }
  ]
};

/* 每日反思提示語 */
const REFLECTION_PROMPTS = [
  '今天哪句最難說出口？',
  '今天有哪一句，你覺得到了東京一定用得上？',
  '今天卡住的時候，你會用哪句話求救？',
  '如果現在店員對你講一長串日文，你的第一句反應是什麼？',
  '今天哪個場景，你已經可以不看提示就講完？',
  '今天最順的一句是哪句？把它再唸三遍。'
];
