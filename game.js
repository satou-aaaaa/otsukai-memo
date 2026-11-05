// おつかいメモ：品物・覚え方のコツ・1日の問題の作り方。画面（index.html）と検査（qa/run.mjs）の両方から使う。
// 今日のおつかい・上級は日本時間の日付から作る乱数で決まり、だれでも同じ。ブラウザの乱数は練習ととことんだけ。
(function (root) {
  "use strict";
  // [id, 絵, 名前, 値段（円）, 売り場]。id は記録（買い物帳）に残るので、変えない・消さない（足すのは最後に）
  const GROUPS = ["野菜", "果物", "魚・肉・卵", "パン・おかし", "飲み物", "日用品"];
  const ITEMS = [
    ["carrot", "🥕", "にんじん", 100, 0], ["cucumber", "🥒", "きゅうり", 80, 0], ["tomato", "🍅", "トマト", 150, 0], ["potato", "🥔", "じゃがいも", 120, 0],
    ["onion", "🧅", "たまねぎ", 90, 0], ["eggplant", "🍆", "なす", 110, 0], ["broccoli", "🥦", "ブロッコリー", 180, 0], ["corn", "🌽", "とうもろこし", 130, 0],
    ["apple", "🍎", "りんご", 160, 1], ["banana", "🍌", "バナナ", 200, 1], ["mikan", "🍊", "みかん", 300, 1], ["grape", "🍇", "ぶどう", 400, 1],
    ["strawberry", "🍓", "いちご", 350, 1], ["peach", "🍑", "もも", 250, 1], ["lemon", "🍋", "レモン", 100, 1], ["kiwi", "🥝", "キウイ", 120, 1],
    ["fish", "🐟", "さかな", 300, 2], ["shrimp", "🦐", "えび", 380, 2], ["squid", "🦑", "いか", 280, 2], ["octopus", "🐙", "たこ", 350, 2],
    ["egg", "🥚", "たまご", 230, 2], ["chicken", "🍗", "とりにく", 320, 2], ["bacon", "🥓", "ベーコン", 260, 2], ["crab", "🦀", "かに", 500, 2],
    ["bread", "🍞", "食パン", 170, 3], ["onigiri", "🍙", "おにぎり", 140, 3], ["cookie", "🍪", "クッキー", 210, 3], ["donut", "🍩", "ドーナツ", 150, 3],
    ["choco", "🍫", "チョコ", 120, 3], ["dango", "🍡", "だんご", 180, 3], ["senbei", "🍘", "せんべい", 220, 3], ["cheese", "🧀", "チーズ", 270, 3],
    ["milk", "🥛", "牛乳", 210, 4], ["tea", "🍵", "お茶", 130, 4], ["coffee", "☕", "コーヒー", 150, 4], ["juice", "🧃", "ジュース", 110, 4],
    ["water", "💧", "お水", 90, 4], ["blacktea", "🫖", "紅茶", 280, 4], ["cola", "🥤", "炭酸水", 140, 4], ["honey", "🍯", "はちみつ", 450, 4],
    ["tissue", "🧻", "紙タオル", 240, 5], ["soap", "🧼", "せっけん", 160, 5], ["brush", "🪥", "歯ブラシ", 190, 5], ["sponge", "🧽", "スポンジ", 100, 5],
    ["battery", "🔋", "電池", 330, 5], ["bulb", "💡", "電球", 420, 5], ["candle", "🕯️", "ろうそく", 200, 5], ["scissors", "✂️", "はさみ", 300, 5],
  ];
  const BY = {}; ITEMS.forEach((it, i) => { BY[it[0]] = { id: it[0], e: it[1], n: it[2], p: it[3], g: it[4], i }; });
  const IDS = ITEMS.map((it) => it[0]);

  // 覚え方のコツ（毎日1つ）。記憶の練習でよく使われる方法：仲間で分ける・絵を思いうかべる・お話にする・声に出す・頭の字・場所に置く
  // ex(list) は、今日のメモで使う例。答えを新しく言うのでなく、見えているメモの組み立て方だけを示す
  const TIPS = [
    { id: "group", t: "仲間で分ける", d: "売り場ごとにまとめると、思い出す手がかりが増えます。", ex: (l) => { const c = {}; l.forEach((id) => { const g = GROUPS[BY[id].g]; c[g] = (c[g] || 0) + 1; }); return Object.entries(c).map(([g, n]) => `${g} ${n}つ`).join("・"); } },
    { id: "picture", t: "絵を思いうかべる", d: "品物が台所にならんでいる様子を、色まで思いうかべます。", ex: () => "" },
    { id: "story", t: "お話にする", d: "品物をつないで短いお話を作ると、順に思い出せます。", ex: (l) => `「${BY[l[0]].n}」と「${BY[l[1]].n}」で、何を作りますか？` },
    { id: "voice", t: "声に出して読む", d: "声に出すと、目で見るだけより残りやすくなります。", ex: () => "" },
    { id: "initial", t: "頭の字をつなぐ", d: "品物の頭の字を、ひとつの言葉のように覚えます。", ex: (l) => l.map((id) => BY[id].n.slice(0, 1)).join("・") },
    { id: "place", t: "家の中に置いてみる", d: "玄関・台所・食卓…と、通る順に品物を置いていきます。", ex: () => "" },
    { id: "count", t: "数を先に覚える", d: "「全部でいくつ」を先に覚えると、思い出しの抜けに気づけます。", ex: (l) => `全部で ${l.length}つ` },
  ];

  // ---- 乱数（同じ種ならどの端末でも同じ）----
  function seedOf(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffled(arr, R) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // 棚の大きさ：メモの品が4つまでは9ます、7つまでは12ます、それより多いと16ます
  const shelfSize = (n) => (n <= 4 ? 9 : n <= 7 ? 12 : 16);
  // 1回のおつかい：メモの品 n 個と、棚（メモの品＋同じ売り場のまぎらわしい品を先に、残りはほかの品）
  // avoid の品はメモにも棚にも出さない（同じ日のほかのおつかいの品）
  function makeTrip(R, n, avoid, pay) {
    const pool = shuffled(IDS.filter((id) => !avoid.includes(id)), R);
    // メモの品は売り場が3つ以上にまたがるように選ぶ（同じ売り場ばかりにしない）
    let list = pool.slice(0, n);
    for (let tries = 0; tries < 20 && new Set(list.map((id) => BY[id].g)).size < Math.min(3, n); tries++) list = shuffled(pool, R).slice(0, n);
    // それでも足りないときは、乱数を引かずに入れかえる（重なっている売り場の品を、まだ無い売り場の品に）
    for (const id of pool) {
      const gs = list.map((x) => BY[x].g);
      if (new Set(gs).size >= Math.min(3, n)) break;
      if (list.includes(id) || gs.includes(BY[id].g)) continue;
      const j = gs.findIndex((g, k) => gs.indexOf(g) !== k);
      if (j >= 0) list[j] = id;
    }
    const size = shelfSize(n), rest = pool.filter((id) => !list.includes(id));
    const same = rest.filter((id) => list.some((x) => BY[x].g === BY[id].g)), other = rest.filter((id) => !same.includes(id));
    // まぎらわしい品を半分ほど、のこりはほかの売り場から。ほかの売り場が足りなければ同じ売り場で埋める
    const near = Math.min(same.length, Math.ceil((size - n) / 2)), far = other.slice(0, size - n - near);
    const fill = same.slice(near, near + (size - n - near - far.length));
    const shelf = shuffled([...list, ...same.slice(0, near), ...far, ...fill], R);
    const total = list.reduce((a, id) => a + BY[id].p, 0);
    const trip = { k: "buy", items: list, shelf, pay: pay || "sum", total };
    if (pay === "change") trip.paid = total < 1000 ? 1000 : total < 2000 ? 2000 : 5000;
    return trip;
  }
  // あとで思い出す：最初のおつかいの品と、その日に買っていない品で棚を作る
  function makeRecall(R, of, trips) {
    const bought = trips.flatMap((t) => t.items), list = trips[of].items;
    const others = shuffled(IDS.filter((id) => !bought.includes(id)), R);
    const size = shelfSize(list.length);
    return { k: "recall", of, items: list.slice(), shelf: shuffled([...list, ...others.slice(0, size - list.length)], R) };
  }
  // 今日のおつかい：3・4・5品の3回と、最後に1回目の品を思い出す
  const DAILY = [3, 4, 5], HARD = [6, 7];
  function dailyList(k) {
    const R = rng(seedOf("d:" + k)), trips = [];
    for (const n of DAILY) trips.push(makeTrip(R, n, trips.flatMap((t) => t.shelf)));
    return [...trips, makeRecall(R, 0, trips)];
  }
  // 上級：6・7品の2回（お会計はおつり）と、1回目の品を思い出す。今日のおつかいのメモの品とは重ねない
  function hardList(k) {
    const R = rng(seedOf("h:" + k)), used = dailyList(k).filter((t) => t.k === "buy").flatMap((t) => t.items), trips = [];
    for (const n of HARD) trips.push(makeTrip(R, n, [...used, ...trips.flatMap((t) => t.items)], "change"));
    return [...trips, makeRecall(R, 0, trips)];
  }
  // 練習・とことん（毎回ちがう。ブラウザの乱数を使う）
  const freeTrip = (n, pay) => makeTrip(Math.random, n, [], pay);
  const TIP_OF = (k, EPOCH) => TIPS[Math.max(0, Math.round((Date.parse(k) - Date.parse(EPOCH)) / 864e5)) % TIPS.length];

  root.OM = { GROUPS, ITEMS, BY, IDS, TIPS, TIP_OF, seedOf, rng, shuffled, shelfSize, makeTrip, makeRecall, dailyList, hardList, freeTrip, DAILY, HARD };
  if (typeof module !== "undefined") module.exports = root.OM;
})(typeof window !== "undefined" ? window : globalThis);
