// アプリのアイコン（icon-192.png・icon-512.png）を作る。生成りの地に、方眼のメモ用紙と赤いチェック。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#f6efe1"/>
      <g transform="rotate(-5 50 52)">
        <rect x="22" y="16" width="56" height="70" rx="4" fill="#fffbea" stroke="#d9c9a8" stroke-width="1.5"/>
        <rect x="38" y="11" width="24" height="9" rx="2" fill="#f3d98c"/>
        <g stroke="#d6e4f0" stroke-width="1.5"><line x1="26" y1="36" x2="74" y2="36"/><line x1="26" y1="50" x2="74" y2="50"/><line x1="26" y1="64" x2="74" y2="64"/><line x1="26" y1="78" x2="74" y2="78"/></g>
        <g stroke="#c2452d" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M30 30 l4 4 l7 -8"/><path d="M30 44 l4 4 l7 -8"/><path d="M30 58 l4 4 l7 -8"/></g>
        <g stroke="#5c534b" stroke-width="3.5" stroke-linecap="round"><line x1="47" y1="30" x2="68" y2="30"/><line x1="47" y1="44" x2="64" y2="44"/><line x1="47" y1="58" x2="69" y2="58"/><line x1="33" y1="72" x2="60" y2="72"/></g>
      </g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
