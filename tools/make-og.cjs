// SNS で貼られたときの絵（og.png 1200×630）を作る。今日のメモの品（答え）は入れず、ゲームの品（ITEMS）に無い見本の品だけ（QA が見る）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:70px 80px;background:#f6efe1;color:#2a2420;position:relative;overflow:hidden">
    <div style="font-size:34px;color:#8f2f1e;letter-spacing:.1em">だれでも同じ 1日3回・時間制限なし</div>
    <div style="font-size:110px;font-weight:900;margin-top:16px;letter-spacing:.06em">おつかいメモ</div>
    <div style="font-size:40px;margin-top:18px;line-height:1.5">覚える・選ぶ・計算する<br>最後に思い出せる？</div>
    <div style="position:absolute;left:760px;top:250px;width:340px;height:330px;background:#fffbea;background-image:linear-gradient(#d6e4f0 2px,transparent 2px);background-size:100% 66px;background-position:0 70px;border-radius:6px;box-shadow:0 10px 24px #2a242030;transform:rotate(-4deg);padding:28px 30px;box-sizing:border-box">
      <div style="font-size:26px;color:#5c534b">おつかいメモ</div>
      <div style="font-size:44px;line-height:66px;margin-top:6px">🍚 お米<br>🧂 しお<br>🧈 バター<br>🫑 ピーマン</div>
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
