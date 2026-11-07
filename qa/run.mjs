// おつかいメモの検査。品物のデータ・1日のおつかいの組み方（3年分）・通しで遊ぶ（覚える→選ぶ→お会計→思い出す）・続きから・ヒント・上級・練習・とことん・
// 買い物帳・実績・カレンダー・あとから・Ko-fi・言い方（医療の効果をうたわない）・文字の大きさ・スマホ幅・PWA を確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";
import { spawnSync } from "node:child_process";
import { checkSwStall } from "./sw-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const OM = createRequire(import.meta.url)(path.join(root, "game.js"));
const KEY = "otsukai-v1";
mkdirSync(path.join(root, "qa-report"), { recursive: true });

// 1. 品物のデータ
{
  const ids = OM.IDS, by = OM.BY;
  check("品物は48品・id が重ならない・売り場6つに8品ずつ", ids.length === 48 && new Set(ids).size === 48 && OM.GROUPS.every((_, g) => ids.filter((id) => by[id].g === g).length === 8));
  check("値段は50〜500円の10円単位（暗算しやすい）", ids.every((id) => by[id].p >= 50 && by[id].p <= 500 && by[id].p % 10 === 0));
  check("品の名前は6字以内・絵がある・名前が重ならない", ids.every((id) => [...by[id].n].length <= 6 && by[id].e) && new Set(ids.map((id) => by[id].n)).size === 48);
  check("覚え方のコツは7つ・どれも名前と説明がある・例はメモにある品だけを使う", OM.TIPS.length === 7 && OM.TIPS.every((t) => t.t && t.d && typeof t.ex === "function") && OM.TIPS.every((t) => { const l = ["carrot", "apple", "milk"], ex = t.ex(l); return !OM.IDS.filter((id) => !l.includes(id)).some((id) => ex.includes(OM.BY[id].n)); }));
}

// 2. 1日のおつかいの組み方（日付の乱数。3年分）
{
  const bad = [], days = [];
  for (let n = 0; n < 1100; n++) {
    const k = new Date(Date.parse("2026-11-05") + n * 864e5).toISOString().slice(0, 10), d = OM.dailyList(k), h = OM.hardList(k), buys = d.filter((t) => t.k === "buy"), hb = h.filter((t) => t.k === "buy");
    days.push(JSON.stringify(d));
    const ok = (t, n2, size) => t.items.length === n2 && t.shelf.length === size && new Set(t.shelf).size === size && t.items.every((x) => t.shelf.includes(x)) && t.total === t.items.reduce((a, id) => a + OM.BY[id].p, 0) && new Set(t.items.map((x) => OM.BY[x].g)).size >= 3;
    if (d.length !== 4 || !ok(buys[0], 3, 9) || !ok(buys[1], 4, 9) || !ok(buys[2], 5, 12) || d[3].k !== "recall") bad.push(k + " 形");
    // 同じ日のおつかいどうしは棚の品が重ならない（思い出しで、どの回の品か迷わない）
    if (new Set(buys.flatMap((t) => t.shelf)).size !== 9 + 9 + 12) bad.push(k + " 棚の重なり");
    const rc = d[3], other = buys.slice(1).flatMap((t) => t.items);
    if (rc.of !== 0 || rc.shelf.length !== 9 || !buys[0].items.every((x) => rc.shelf.includes(x)) || rc.shelf.some((x) => other.includes(x)) || new Set(rc.shelf).size !== 9) bad.push(k + " 思い出し");
    // 同じ売り場のまぎらわしい品が棚に入る
    if (buys.some((t) => !t.shelf.some((x) => !t.items.includes(x) && t.items.some((y) => OM.BY[y].g === OM.BY[x].g)))) bad.push(k + " まぎらわしい品なし");
    if (h.length !== 3 || !ok(hb[0], 6, 12) || !ok(hb[1], 7, 12) || hb.some((t) => t.pay !== "change" || !(t.paid > t.total) || (t.paid - t.total > 1000 && t.paid !== 5000)) || h[2].k !== "recall" || h[2].shelf.length !== 12) bad.push(k + " 上級の形");
    if (hb.some((t) => t.items.some((x) => buys.some((b) => b.items.includes(x)))) || new Set(hb.flatMap((t) => t.items)).size !== 13) bad.push(k + " 上級の重なり");
  }
  { let bad2 = 0; for (const R of [() => 0, () => 0.999999, () => 0.5]) for (let n = 3; n <= 12; n++) { const tr = OM.makeTrip(R, n, [], "sum"); if (new Set(tr.items.map((x) => OM.BY[x].g)).size < Math.min(3, n)) bad2++; }
    check("乱数がかたよっても、メモの品は3つ以上の売り場にまたがる（入れかえの守り）", bad2 === 0, String(bad2)); }
  check("今日のおつかいは毎日 3品・4品・5品（棚9・9・12）と思い出し。上級は6品・7品（棚12・おつり）と思い出し（3年分）", bad.length === 0, bad.slice(0, 4).join(","));
  check("日ごとにちがうおつかいになる（3年分で同じ日が無い）", new Set(days).size === days.length);
  check("同じ日付なら何度作っても同じ", JSON.stringify(OM.dailyList("2027-03-01")) === JSON.stringify(OM.dailyList("2027-03-01")) && JSON.stringify(OM.hardList("2027-03-01")) === JSON.stringify(OM.hardList("2027-03-01")));
  // 練習・とことんのおつかいも、何百回作って形を確かめる
  const fb = [];
  for (let n = 3; n <= 12; n++) for (let j = 0; j < 300; j++) { const t = OM.freeTrip(n, "sum"), size = OM.shelfSize(n); if (t.items.length !== n || t.shelf.length !== size || new Set(t.shelf).size !== size || !t.items.every((x) => t.shelf.includes(x))) fb.push(n); }
  check("練習・とことんのおつかい（3〜12品×300回）も、棚にメモの品が全部あり重ならない", fb.length === 0, fb.slice(0, 5).join(","));
}

// 3. ファイルの決まり
const html = readFileSync(path.join(root, "index.html"), "utf8"), game = readFileSync(path.join(root, "game.js"), "utf8"), readme = readFileSync(path.join(root, "README.md"), "utf8");
{
  const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$|^https:\/\/www\.who\.int\/|^https:\/\/doi\.org\//.test(u));
  check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典は押したときに開くリンクだけ）", ext.length === 0 && !/<script[^>]+src="https?:/.test(html), ext.join(","));
  check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
  check("Math.random は練習・とことんのおつかいと、回の名札だけ（今日・上級は日付の乱数）", (game.match(/Math\.random/g) || []).length === 1 && /freeTrip = \(n, pay\) => makeTrip\(Math\.random/.test(game) && (html.match(/Math\.random/g) || []).length === 1 && /newId = \(\) => Date\.now\(\) \+ "-" \+ Math\.random/.test(html));
  const bad = (html + game).match(/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/g) || [];
  check("並べ替えの比較の中で乱数を引いていない（同じ日に人によって問題が変わらない）", bad.length === 0 && !/\.sort\(/.test(game), bad.join(" | "));
  check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
  // 医療の効果をうたわない：「予防できる」「治る」などの言い切りを置かず、研究の確かさと「医療機器ではない」を書く
  const claims = /予防できます|予防できる|予防します|防げます|治ります|改善します|効果があります|効果が証明|脳が若返|ぼけ防止|認知症にならない|医師も推奨/;
  check("医療の効果を言い切らない（「予防できる」「治る」などを書かない）", !claims.test(html + readme + game), ((html + readme).match(claims) || [""])[0]);
  check("「このゲームについて」に、研究の確かさ（WHO は「勧めてもよい」・根拠はとても低い〜低い）と医療機器でないことを書く", /勧めてもよい/.test(html) && /とても低い〜低い/.test(html) && /医療機器ではなく/.test(html) && /医療機器ではありません|医療機器ではなく/.test(readme));
  const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  { const src = readFileSync(path.join(root, "tools", "make-og.cjs"), "utf8"); const hit = OM.ITEMS.filter((it) => src.includes(it[2]) || src.includes(it[1]));
    check("SNS 用の絵に、ゲームの品（今日のメモに出うる品）を入れない", hit.length === 0, hit.map((it) => it[2]).join(",")); }
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/otsukai-memo/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630);
  const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だと白紙の Issue になる。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3 && /^description:\s*\S/m.test(fy));
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy));
  const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  { const st = await checkSwStall(sw); check("PWA：本文の途中で通信が止まっても4秒で保存したものを返す・ふつうはネットの返事", st.ok, JSON.stringify(st)); }
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js も）、外へ何も送らない", ["./index.html", "./game.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")) && /k\.startsWith\("otsukai-"\)/.test(sw));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "おつかいメモ" && mf.icons.length >= 2 && mf.start_url === "./");
  check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readme.replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
  check("hidden を使う要素が出たままにならない（[hidden]{display:none}）", /\[hidden\]\{display:none!important\}/.test(html));
  check("キーボードの枠の決まりは style の最後に強く書く", /:is\(\.icon,button,a\):focus-visible\{outline:[^}]+!important[^}]*\}\s*<\/style>/.test(html));
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const isNoise = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(t);
const errors = [];
// その日の日本時間 12時に時計を合わせたページ（記録 state を入れて開く）
async function pageAt(day, w = 390, state = null, fs = null) {
  const pg = await (await browser.newContext({ viewport: { width: w, height: 844 } })).newPage();
  pg.on("pageerror", (e) => errors.push(e.stack));
  pg.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
  await pg.context().addInitScript((at) => { const RD = Date, off = RD.parse(at) - RD.now(); window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; }, day + "T03:00:00Z");
  await pg.goto(url);
  await pg.evaluate(([k, st, f]) => { localStorage.clear(); if (st) localStorage.setItem(k, JSON.stringify(st)); if (f) localStorage.setItem("otsukai-fs", String(f)); }, [KEY, state, fs]);
  await pg.reload();
  return pg;
}
const run = (pg) => pg.evaluate(() => { const g = window.__om, s = g.load(); return s.runs[g.mode()]; });
const trip = async (pg) => { const r = await run(pg); return r.list[r.res.length]; };
// 1回のおつかいを、まちがいなしで終える（覚える→選ぶ→お会計）
async function doTrip(pg) {
  const t = await trip(pg);
  if (await pg.locator("#ready").count()) await pg.click("#ready");
  for (const id of t.items) { const b = pg.locator(`#shelf .item[data-id="${id}"]`); if (!(await b.getAttribute("class")).includes("got")) await b.click(); }
  if (t.pay !== "none") { await pg.waitForSelector("#pad"); await typeYen(pg, t.pay === "change" ? t.paid - t.total : t.total); }
  await pg.waitForSelector("#next");
  return t;
}
async function typeYen(pg, n) { for (const d of String(n)) await pg.click(`#pad button[data-d="${d}"]`); await pg.click('#pad button[data-d="go"]'); }
async function doRecall(pg, wrong = 0) {
  const t = await trip(pg), pick = t.items.slice(0, t.items.length - wrong).concat(t.shelf.filter((x) => !t.items.includes(x)).slice(0, wrong));
  for (const id of pick) await pg.click(`#shelf .item[data-id="${id}"]`);
  await pg.click("#decide"); await pg.click("#next");
}
async function doDay(pg) { for (let j = 0; j < 3; j++) { await doTrip(pg); await pg.click("#next"); } await doRecall(pg); }

try {
  const D = "2026-11-20";
  const pg = await pageAt(D);
  // 4. 通しで遊ぶ（まちがい・ヒント・続きから・お会計のやり直しを含む）
  check("初めて開くと遊び方が出る", await pg.locator("#howto[open]").count() === 1);
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(100); check("遊び方を Esc で閉じられる", await pg.locator("#howto[open]").count() === 0);
  await pg.reload(); await pg.waitForTimeout(200); check("遊び方を Esc で閉じても、開き直したとき出ない", await pg.locator("#howto[open]").count() === 0);
  await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(200); await pg.click("#howto-ok"); await pg.reload(); await pg.waitForTimeout(200); check("遊び方を「わかった」で閉じてすぐ読み直しても出ない", await pg.locator("#howto[open]").count() === 0);
  { let again = 0; for (let i = 0; i < 10; i++) { await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(200); await pg.keyboard.press("Escape"); await pg.reload(); await pg.waitForTimeout(200); again += await pg.locator("#howto[open]").count(); } check("遊び方を Esc で閉じてすぐ読み直しても出ない（10回）", again === 0); }
  { const c = await browser.newContext(); const r = await c.newPage(); const big = []; // 題が h1{flex:1} で縦に伸び（伸びない形と比べて4pxより高ければ失敗）、iPad の縦で大きなすき間が出た（shared-workflows incidents/2026-11-07-title-stretched.md）
    for (const [w, h] of [[820, 1180], [390, 844], [1280, 800]]) { await r.setViewportSize({ width: w, height: h }); await r.goto(url); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.waitForTimeout(100);
      const v = await r.evaluate(() => { const e = [...document.querySelectorAll(".title")].find((x) => x.offsetParent); if (!e) return null; const h = e.getBoundingClientRect().height; const f = e.style.flex; e.style.flex = "none"; const n = e.getBoundingClientRect().height; e.style.flex = f; return h - n; });
      if (v === null || v > 4) big.push(`${w}x${h}:${v === null ? "題なし" : "+" + Math.round(v) + "px"}`); }
    check("ホームの題は縦長の画面でも縦に伸びない（820×1180・390×844・1280×800）", big.length === 0, big.join(" ")); await c.close(); }
  await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(200); check("「わかった」を押したその場で「見た」が残る", await pg.locator("#howto-ok").evaluate((b) => { b.click(); return Object.keys(localStorage).some((k) => { try { return JSON.parse(localStorage.getItem(k)).tut === true; } catch { return false; } }); }));
  await pg.evaluate(() => document.documentElement.classList.add("a11y-read")); await pg.click('[data-fs="3"]');
  check("文字の大きさを変えても、見やすさの設定（a11y-read）を消さない", await pg.evaluate(() => document.documentElement.classList.contains("a11y-read") && document.documentElement.classList.contains("fs3") && !document.documentElement.classList.contains("fs1")));
  await pg.click('[data-fs="1"]'); await pg.evaluate(() => document.documentElement.classList.remove("a11y-read"));
  await pg.click("#go-d");
  let t = await trip(pg);
  check("1回目はメモに3品・覚え方のコツが出る・時間制限なし", (await pg.locator("#memo li").count()) === 3 && (await pg.textContent("#memo")).includes(OM.BY[t.items[0]].n) && (await pg.textContent("#tip")).includes("覚え方のコツ") && !/秒|タイマー|制限時間/.test(await pg.textContent("#app")));
  const sayOf = () => pg.evaluate(() => [...document.querySelectorAll("[data-a11y-say]")].filter((el) => el.offsetParent).map((el) => el.innerText.trim()).filter(Boolean).join("。"));
  check("読み上げ（🔊 読む）でメモの品を読める（data-a11y-say）", (await sayOf()).includes(OM.BY[t.items[0]].n));
  await pg.click("#ready");
  check("お店に入るとメモは見えず、棚に9品が出る", (await pg.locator("#memo").count()) === 0 && (await pg.locator("#shelf .item").count()) === 9);
  check("読み上げ（🔊 読む）で棚の問いを読める", (await sayOf()).includes("棚から選んで"));
  const wrong = t.shelf.find((x) => !t.items.includes(x));
  await pg.click(`#shelf .item[data-id="${wrong}"]`);
  check("メモに無い品を押すと「ありませんでした」と出て、まちがいに数える（ゲームは続く）", (await pg.textContent("#msg")).includes("ありませんでした") && (await run(pg)).cur.miss === 1);
  await pg.click(`#shelf .item[data-id="${t.items[0]}"]`);
  check("メモの品を押すと、かごに入る", (await pg.textContent("#msg")).includes("ありました") && (await pg.locator("#shelf .item.got").count()) === 1);
  await pg.click("#hint");
  const hb = await pg.textContent("#hintbox");
  check("ヒント1回目は、のこりの品の売り場だけ（品の名前は出さない）", hb.includes("売り場") && !t.items.slice(1).some((id) => hb.includes(OM.BY[id].n)), hb);
  await pg.click("#hint");
  check("ヒント2回目は、のこりの品を1つ光らせる。ヒントは2回まで", (await pg.locator("#shelf .item.glow").count()) === 1 && await pg.locator("#hint").isDisabled());
  await pg.reload(); await pg.click("#go-d");
  check("途中で閉じても、棚の画面から続き（メモは見直せない）・かご・まちがい・ヒントもそのまま", (await pg.locator("#memo").count()) === 0 && (await pg.locator("#shelf .item.got").count()) === 1 && (await pg.locator("#shelf .item.ng").count()) === 1 && (await pg.locator("#shelf .item.glow").count()) === 1);
  for (const id of t.items.slice(1)) await pg.click(`#shelf .item[data-id="${id}"]`);
  await pg.waitForSelector("#pad");
  check("お会計：品と値段が出て、合計を聞く", (await pg.textContent("#q")).includes("合計") && (await pg.locator("#receipt .price").count()) === 3);
  await typeYen(pg, t.total + 100);
  check("合計をまちがえると「多いようです」と出て、もう一度入れられる", (await pg.textContent("#msg")).includes("多い") && (await pg.locator("#pad button").count()) === 12);
  await pg.click('#pad button[data-d="1"]'); await pg.click('#pad button[data-d="del"]');
  check("「消す」で1字消せる", (await pg.textContent("#disp")).startsWith("0"));
  await typeYen(pg, t.total);
  await pg.waitForSelector("#next");
  check("合計が合うと、そのおつかいの結果（★・まちがい・ヒント・お会計）が出る", (await pg.textContent(".verdict")).includes("まちがい 1") && (await pg.textContent(".verdict")).includes("ヒント 2") && (await pg.textContent(".verdict")).includes("1回やり直し"));
  await pg.click("#next");
  t = await doTrip(pg); await pg.click("#next");
  // 3回目はお会計を2回まちがえて、答えを見て進む
  t = await trip(pg); await pg.click("#ready"); for (const id of t.items) await pg.click(`#shelf .item[data-id="${id}"]`);
  await pg.waitForSelector("#pad"); await typeYen(pg, 1); await typeYen(pg, 2);
  check("お会計を2回まちがえると、計算のしかたと答えを見せて先へ進める（止まらない）", (await pg.textContent("#msg")).includes(`${t.total.toLocaleString("ja-JP")}円`) && await pg.locator("#go-next").count() === 1);
  await pg.reload(); await pg.click("#go-d");
  check("答えを見たあと閉じても、続きから（次の画面へ進む）", await pg.locator("#next").count() === 1);
  await pg.click("#next");
  t = await trip(pg);
  check("最後は1回目の品を思い出す（棚に9品・品の数を言う）", t.k === "recall" && (await pg.locator("#shelf .item").count()) === 9 && (await pg.textContent("#app")).includes("3品あります"));
  await pg.click(`#shelf .item[data-id="${t.items[0]}"]`); await pg.click(`#shelf .item[data-id="${t.items[0]}"]`);
  check("思い出しは押し直すと外せる", (await pg.locator("#shelf .item.sel").count()) === 0 && await pg.locator("#decide").isDisabled());
  await pg.click(`#shelf .item[data-id="${t.items[0]}"]`); await pg.click(`#shelf .item[data-id="${t.items[1]}"]`); await pg.click(`#shelf .item[data-id="${t.shelf.find((x) => !t.items.includes(x))}"]`);
  await pg.reload(); await pg.click("#go-d"); await pg.waitForSelector("#decide");
  check("思い出しを続きから開くと、選んだ品は読み上げでも選択中（aria-pressed）", (await pg.locator('#shelf .item[aria-pressed="true"]').count()) === 3 && (await pg.locator('#shelf .item[aria-pressed="false"]').count()) === 6);
  await pg.click("#decide");
  check("思い出しの答え合わせ：思い出せなかった品に点線・ちがう品に✕", (await pg.locator("#shelf .item.miss").count()) === 1 && (await pg.locator("#shelf .item.ng").count()) === 1 && (await pg.textContent(".verdict")).includes("2品"));
  await pg.click("#next");
  const s1 = await pg.evaluate(() => window.__om.load());
  const rec = s1.days[D];
  check("今日の記録：回ごとのまちがい・ヒント・お会計と、思い出し（2/3・ちがう品1）", rec && JSON.stringify(rec.m) === "[1,0,0]" && JSON.stringify(rec.h) === "[2,0,0]" && JSON.stringify(rec.c) === "[1,0,2]" && JSON.stringify(rec.r) === "[2,3,1]", JSON.stringify(rec));
  check("買い物帳に12品・おつかいの数3・一度で合ったお会計1", Object.keys(s1.dex).length === 12 && s1.trips === 3 && s1.calc === 1);
  const share = await pg.textContent(".share");
  const all = OM.dailyList(D).flatMap((x) => x.items);
  check("シェアの文に品の名前（答え）を入れない", !all.some((id) => share.includes(OM.BY[id].n)) && share.includes("第16日") && share.includes("🧠2/3"), share);
  check("まちがいがあった日は Ko-fi の1行を出さない", await pg.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」を1つ出す", (await pg.locator("#achnext").count()) === 1);
  check("今日の結果から、とことん・上級・練習へ進める", (await pg.locator("#go-e").count()) === 1 && (await pg.locator("#go-h").count()) === 1);
  // 5. 上級
  await pg.click("#go-h");
  t = await trip(pg);
  check("上級は6品のメモ・棚12品", t.items.length === 6 && (await pg.locator("#memo li").count()) === 6);
  await pg.click("#ready"); for (const id of t.items) await pg.click(`#shelf .item[data-id="${id}"]`);
  await pg.waitForSelector("#pad");
  check("上級のお会計はおつり（札で払う）", (await pg.textContent("#q")).includes("おつり") && (await pg.textContent("#receipt")).includes("札で払います"));
  await typeYen(pg, t.paid - t.total); await pg.waitForSelector("#next"); await pg.click("#next");
  await doTrip(pg); await pg.click("#next"); await doRecall(pg);
  const s2 = await pg.evaluate(() => window.__om.load());
  check("上級の記録は hdays に入り、今日の記録は変えない", s2.hdays[D] && s2.days[D] && JSON.stringify(s2.days[D]) === JSON.stringify(rec));
  check("上級を全部まちがいなしで初めて終えると Ko-fi の1行が出る", await pg.locator(".kofi").count() === 1);
  await pg.click("#back"); await pg.click("#go-h");
  check("上級をもう一度押すと結果を見るだけ（Ko-fi はもう出ない）", (await pg.locator("#share").count()) === 1 && await pg.locator(".kofi").count() === 0);
  await pg.click("#back");
  check("ホームの「今日のおつかい」は結果を見るボタンになる", (await pg.textContent("#go-d")).includes("結果を見る"));
  // 6. 練習（記録を増やさない）
  await pg.click("#go-p"); await pg.click('[data-n="5"]');
  await doTrip(pg); await pg.click("#next");
  const s3 = await pg.evaluate(() => window.__om.load());
  check("練習は今日の記録・遊んだ日を増やさない（買い物帳には載る）", Object.keys(s3.days).length === 1 && s3.trips === s2.trips + 1 && !s3.runs.p);
  await pg.click("#back");
  // 7. とことん
  await pg.click("#go-e");
  await doTrip(pg);
  let r = await run(pg);
  check("とことん：一度で覚えると次は1品ふえる（お会計なし）", r.len === 4 && r.list[1].items.length === 4 && (await pg.locator("#receipt").count()) === 0);
  await pg.click("#next");
  t = await trip(pg); await pg.click("#ready"); await pg.click(`#shelf .item[data-id="${t.shelf.find((x) => !t.items.includes(x))}"]`); for (const id of t.items) await pg.click(`#shelf .item[data-id="${id}"]`);
  await pg.waitForSelector("#next");
  r = await run(pg);
  check("とことん：まちがえると🧺が1つ減り、同じ品数のまま", r.life === 2 && r.len === 4);
  await pg.click("#quit");
  check("とことん：やめると、一度で覚えた最高の品数と自己ベストを出す（順位表なし）", (await pg.textContent("#eres")).includes("3品") && (await pg.textContent("#ebest")).includes("自己ベスト") && !/順位|ランキング/.test(await pg.textContent("#app")));
  check("とことんの自己ベストは記録に残る", (await pg.evaluate(() => window.__om.load().ebest)) === 3);
  await pg.close();

  // 8. とことんは🧺3つで終わる
  { const pe = await pageAt(D); await pe.click("#howto-ok"); await pe.click("#go-e");
    for (let j = 0; j < 3; j++) { const tt = await trip(pe); await pe.click("#ready"); await pe.click(`#shelf .item[data-id="${tt.shelf.find((x) => !tt.items.includes(x))}"]`); for (const id of tt.items) await pe.click(`#shelf .item[data-id="${id}"]`); await pe.waitForSelector("#next"); await pe.click("#next"); }
    check("とことん：まちがえた回が3回で終わり、結果へ", (await pe.locator("#eres").count()) === 1 && !(await pe.evaluate(() => window.__om.load().runs.e)));
    await pe.close(); }

  // 9. 実績・カレンダー・あとから
  { const pa = await pageAt(D); await pa.click("#howto-ok");
    const a = await pa.evaluate(() => { const g = window.__om; return { n: g.ACH.length, grp: [0, 1, 2].map((x) => g.ACH.filter((y) => y[3] === x).length), none: g.achGot(g.load()).length }; });
    check("実績は12個（腕前・集める・続けるをまぜる）・初めはどれも未達成", a.n === 12 && a.grp.every((x) => x >= 3) && a.none === 0, JSON.stringify(a));
    await pa.click("#go-ach");
    check("まだの実績は「いま/目標」と進み具合のバーを出す", /^0\/\d+$/.test((await pa.locator(".ach .pg").first().textContent()).trim()) && (await pa.locator(".ach .bar").count()) === 12);
    await pa.click("#back"); await pa.click("#go-cal");
    check("カレンダー：取りこぼした過去7日（始めた日より後）を、押すとあとから遊べる", (await pa.locator(".cal .miss").count()) === 7 && (await pa.locator('.cal .miss[data-k="2026-11-13"]').count()) === 1 && (await pa.locator('.cal .miss[data-k="2026-11-12"]').count()) === 0);
    await pa.click('.cal .miss[data-k="2026-11-18"]');
    const lt = await trip(pa);
    check("あとからは、その日の今日のおつかいと同じ問題", JSON.stringify(lt) === JSON.stringify(OM.dailyList("2026-11-18")[0]));
    await doDay(pa);
    const sa = await pa.evaluate(() => { const g = window.__om, s = g.load(); return { a: !!s.adays["2026-11-18"], d: Object.keys(s.days).length, st: g.streak(s.days), got: g.achGot(s) }; });
    check("あとから遊んだ日は adays に入り、今日の記録・連続の日には数えない（実績「あとからおつかい」は取れる）", sa.a && sa.d === 0 && sa.st === 0 && sa.got.includes("late1"), JSON.stringify(sa));
    check("あとからの結果にはシェアと Ko-fi を出さない", (await pa.locator("#share").count()) === 0 && (await pa.locator(".kofi").count()) === 0);
    await pa.click("#go-cal");
    check("カレンダーにあとから遊んだ日が ↺ で残る", (await pa.locator('.cal .late[data-k="2026-11-18"]').count()) === 1);
    await pa.close(); }

  // 10. 全部まちがいなしの日は Ko-fi が1回だけ・実績が出る
  { const pk = await pageAt(D); await pk.click("#howto-ok"); await pk.click("#go-d"); await doDay(pk);
    check("今日のおつかいを全部まちがいなし・思い出しも満点で初めて終えると、Ko-fi の1行と実績が出る", (await pk.locator(".kofi").count()) === 1 && (await pk.textContent("#achnew")).includes("まちがいなしの日"));
    await pk.reload();
    check("開き直して結果を見ても Ko-fi はもう出ない", (await pk.locator(".kofi").count()) === 0);
    await pk.close(); }

  // 11. しばらくぶりの人を迎える・連続は1日以上のときだけ
  { const st = { v: 1, days: { "2026-11-10": { m: [0, 0, 0], h: [0, 0, 0], c: [0, 0, 0], r: [3, 3, 0] } }, hdays: {}, adays: {}, dex: {}, runs: {}, tut: true, kofi: {}, ebest: 0, calc: 0, trips: 3 };
    const pw = await pageAt(D, 390, st);
    check("しばらくぶりに来た人に「おかえりなさい」（休んだ日を責めない）", (await pw.locator("#welcome").count()) === 1 && !/途切れ|サボ|休んだ/.test(await pw.textContent("#app")));
    await pw.click("#go-cal");
    check("連続が0日のときは「連続」を出さない", !(await pw.textContent("header")).includes("連続"));
    await pw.close(); }

  // 12. 別のタブで先に進んだら、古い画面の答えは入れない
  { const p1 = await pageAt(D); await p1.click("#howto-ok"); await p1.click("#go-d"); await p1.click("#ready");
    const p2 = await p1.context().newPage(); p2.on("pageerror", (e) => errors.push(e.stack)); await p2.goto(url); await p2.click("#go-d");
    const tt = await trip(p2); for (const id of tt.items) await p2.click(`#shelf .item[data-id="${id}"]`); await p2.waitForSelector("#pad"); await typeYen(p2, tt.total); await p2.waitForSelector("#next");
    await p1.click(`#shelf .item[data-id="${tt.items[0]}"]`);
    const sx = await p1.evaluate(() => window.__om.load().runs.d);
    check("別のタブで先に進んだあと、古いタブで押しても二重に入れない", sx.res.length === 1 && !(sx.cur && sx.cur.got && sx.cur.got.length));
    await p2.close(); await p1.close(); }
  // 12b. 同じ回で別のタブが品を選んだら、古い画面からはその品を消さない（2026-11-05 CodeRabbit）
  { const p1 = await pageAt(D); await p1.click("#howto-ok"); await p1.click("#go-d"); await p1.click("#ready");
    const p2 = await p1.context().newPage(); p2.on("pageerror", (e) => errors.push(e.stack)); await p2.goto(url); await p2.click("#go-d"); await p2.waitForSelector("#shelf");
    const tt = await trip(p1);
    await p1.click(`#shelf .item[data-id="${tt.items[0]}"]`);
    await p2.click(`#shelf .item[data-id="${tt.items[1]}"]`);
    const sx = await p2.evaluate(() => window.__om.load().runs.d.cur);
    check("古いタブで選んでも、別のタブで選んだ品を消さない", sx && sx.got.length === 1 && sx.got[0] === tt.items[0]);
    await p2.waitForSelector(`#shelf .item.got[data-id="${tt.items[0]}"]`);
    check("古いタブは保存の中身で作り直す", (await p2.$$("#shelf .item.got")).length === 1);
    await p2.reload(); await p2.click("#go-d"); await p2.waitForSelector("#shelf");
    check("読み直しても、先に選んだ品が残る", (await p2.$$(`#shelf .item.got[data-id="${tt.items[0]}"]`)).length === 1);
    await p2.close(); await p1.close(); }

  // 13. 文字の大きさ・スマホ幅
  { const pf = await pageAt(D); await pf.click("#howto-ok");
    await pf.click('[data-fs="3"]');
    check("文字の大きさを「とても大きい」にすると、文字が大きくなり、開き直しても残る", (await pf.evaluate(() => getComputedStyle(document.documentElement).fontSize)) === "24px" && (await pf.reload(), await pf.evaluate(() => document.documentElement.className)) === "fs3");
    await pf.close(); }
  for (const fs of [1, 3]) for (const w of [320, 390]) {
    const pw = await pageAt(D, w, null, fs), bad = [];
    const look = async (name) => { await pw.screenshot({ path: path.join(root, `qa-report/${name}-${w}-fs${fs}.png`), fullPage: true }); const r = await pw.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id) })); if (r.over || r.small.length) bad.push(`${name}:${r.over ? "はみ出し" : ""}${r.small.join("/")}`); };
    await pw.click("#howto-ok"); await look("home"); await pw.click("#go-d"); await look("memo"); await pw.click("#ready"); await look("shelf");
    const tt = await trip(pw); for (const id of tt.items) await pw.click(`#shelf .item[data-id="${id}"]`); await pw.waitForSelector("#pad"); await look("pay");
    await typeYen(pw, tt.total); await pw.waitForSelector("#next"); await pw.click("#next"); await doTrip(pw); await pw.click("#next"); await doTrip(pw); await pw.click("#next"); await look("recall"); await doRecall(pw); await look("result");
    await pw.click("#go-dex"); await look("dex"); await pw.click("#back"); await pw.click("#go-ach"); await look("ach"); await pw.click("#back"); await pw.click("#go-cal"); await look("cal"); await pw.click("#back"); await pw.click("#f-about"); await look("about");
    check(`幅${w}px・文字${fs}：どの画面も横にはみ出さず、押せる所は44px以上`, bad.length === 0, bad.join(" "));
    await pw.close();
  }
  { const pt = await pageAt(D, 320, null, 3); await pt.click("#howto-ok"); await pt.click("#go-p"); await pt.click('[data-n="8"]'); await pt.click("#ready");
    const sz = await pt.evaluate(() => [...document.querySelectorAll("#shelf .item")].map((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)));
    check("幅320px・文字とても大きい・棚16品でも、品のボタンは56px以上", sz.length === 16 && Math.min(...sz) >= 56, Math.min(...sz).toFixed(0) + "px");
    await pt.close(); }
} catch (e) {
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  try {
    const pf = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pf.goto(url); await pf.evaluate(() => localStorage.clear()); await pf.reload();
    await pf.click("#howto-ok").catch(() => {});
    const bad = [];
    for (const open of [null, "#go-cal"]) {
      if (open) await pf.click(open);
      await pf.keyboard.press("Shift");
      bad.push(...await pf.evaluate(() => [...document.querySelectorAll("button:not([disabled]),a[href]")].filter((b) => b.checkVisibility()).filter((b) => { b.focus(); const cs = getComputedStyle(b); return !b.matches(":focus-visible") || cs.outlineStyle === "none" || parseFloat(cs.outlineWidth) < 2; }).map((b) => b.className || b.id || b.tagName)));
    }
    check("キーボードで選んだボタンに枠が出る", bad.length === 0, bad.join(","));
    await pf.close();
  } catch (e) { check("キーボードで選んだボタンに枠が出る", false, e.message.split("\n")[0]); }
  // 引き継ぎコード（別の端末へ記録を移す。shared-workflows template/qa/transfer-check.mjs）
  try {
    const sample = { "otsukai-v1": JSON.stringify({ v: 1, days: { "2026-11-10": { m: [0, 1, 0], h: [0, 0, 0], c: [0, 0, 0], r: [3, 3, 0] } }, hdays: {}, adays: {}, dex: { carrot: 2, apple: 1 }, runs: {}, tut: true, kofi: {}, ebest: 5, calc: 3, trips: 3, t: 1 }), "otsukai-fs": "2" };
    await checkTransfer({ browser, url, game: "otsukai-memo", sample, check, open: async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); } }); // 初めての端末では遊び方が開いているので閉じてから
  } catch (e) { check("引き継ぎの検査が最後まで完了する", false, e.message.split("\n")[0]); }
  // 保存に失敗したら知らせる（2026-11-07 暑さ指数よみで見つけた。黙って記録が消えないように）
  { const ps = await browser.newPage(); await ps.goto(url); await ps.waitForTimeout(200);
    check("保存に失敗したら、保存できるまで知らせ続け、保存できたら消す", await ps.evaluate(async () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("full"); }; save(() => {}); save(() => {}); const one = document.querySelectorAll("#savewarn").length === 1 && document.getElementById("savewarn").textContent.includes("保存できませんでした"); await new Promise((r) => setTimeout(r, 2500)); const stay = !!document.getElementById("savewarn"); Storage.prototype.setItem = orig; save(() => {}); return one && stay && !document.getElementById("savewarn"); }));
    check("保存できない帯は画面のいちばん上に場所を取り（ボタンに重ならない）、読み上げの知らせにも出す", await ps.evaluate(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("full"); }; save(() => {}); const b = document.getElementById("savewarn"); const top = !!b && document.body.firstElementChild === b && getComputedStyle(b).position === "sticky"; const l = document.getElementById("live"); const live = !l || l.textContent.includes("保存できませんでした"); Storage.prototype.setItem = orig; save(() => {}); return top && live && !document.getElementById("savewarn"); }));
    await ps.close(); }
  await browser.close();
}
// 見やすさ・読みやすさ（shared-workflows template/qa/a11y.mjs。コントラスト・字間・動き・枠・決めつけの言葉など）
{ const a = spawnSync(process.execPath, [path.join(root, "qa/a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさの検査（qa/a11y.mjs）が通る", a.status === 0, (a.stdout || "").split("\n").filter((l) => l.startsWith("- ❌")).join(" ").slice(0, 400) || (a.stderr || "").slice(0, 200)); }
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

const ng = results.filter((r) => !r.ok);
const md = `# おつかいメモ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
