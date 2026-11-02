// 화면 불변 확인: 주요 화면의 계산된 스타일을 JSON 으로 남기고, 다른 스냅숏과 비교한다.
// 수동 실행(CI 밖). 개발 서버가 떠 있어야 하고 Playwright 가 필요하다.
//   설치: npm i -D playwright && npx playwright install chromium   (또는 CHROME_PATH 에 Chrome 실행 파일)
//   실행: node scripts/style-snapshot.mjs out.json                  (스냅숏 저장)
//         node scripts/style-snapshot.mjs out.json --compare before.json   (저장 뒤 비교, 다른 값만 출력)
// 주소: SNAPSHOT_BASE 환경 변수(기본 http://localhost:8080/VCT-board/). 실행 파일: CHROME_PATH(선택).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASE = process.env.SNAPSHOT_BASE || "http://localhost:8080/VCT-board/";
const args = process.argv.slice(2);
const cmpAt = args.indexOf("--compare");
const OUT = args[0] && args[0] !== "--compare" ? args[0] : null;
const BEFORE = cmpAt >= 0 ? args[cmpAt + 1] : null;
if (!OUT) { console.error("사용법: node scripts/style-snapshot.mjs out.json [--compare before.json]"); process.exit(2); }

// 요소와 속성. 요소마다 앞에서 몇 개만 잰다(목록은 길다).
const SELECTORS = [".rh h2", ".th", ".name", ".row", ".chip", ".pill", ".tab", ".search", ".lang-switch a", ".support-menu a", ".dock", ".dp-head", ".dp-info dd", ".kr-tag"];
const PER_SELECTOR = 6;
const PROPS = ["font-size", "font-weight", "line-height", "color", "background-color", "border-top-width", "border-top-color", "border-bottom-width", "border-bottom-color", "border-left-width", "border-left-color", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-bottom", "gap", "border-radius", "min-height"];

// 화면: 목록 탭, 인물, 팀, 없는 주소. 목록 탭 id 는 main.js 의 data-tab 값이다.
const TABS = ["players", "coaches", "korea", "transfers", "watch", "schedule", "suggest"];
const teamFile = path.join(ROOT, "data", "teams.json");
const teams = fs.existsSync(teamFile) ? JSON.parse(fs.readFileSync(teamFile, "utf8")) : [];
const PAGES = [
  ...TABS.map((id) => ({ name: "tab:" + id, go: "", tab: id })),
  { name: "person", go: "p/" + (process.env.SNAPSHOT_PERSON || "absol") + "/" },
  { name: "team", go: "t/" + (teams[0] ? teams[0].id : "none") + "/" },
  { name: "missing", go: "p/no-such-person/" }
];
const LANGS = ["ko", "en"], MODES = ["light", "dark"], WIDTHS = [375, 1280];

async function loadPlaywright() {
  // PLAYWRIGHT_MODULE: 모듈 파일 주소(file:// 또는 경로). 설치 없이 다른 위치의 Playwright 를 쓸 때.
  if (process.env.PLAYWRIGHT_MODULE) return import(process.env.PLAYWRIGHT_MODULE);
  for (const name of ["playwright", "playwright-core"]) {
    try { return await import(name); } catch (e) { /* 다음 이름 */ }
  }
  console.error("Playwright 가 없습니다. npm i -D playwright && npx playwright install chromium");
  process.exit(2);
}

async function snapshot() {
  const pw = await loadPlaywright();
  const browser = await pw.chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const out = {};
  try {
    for (const lang of LANGS) for (const mode of MODES) for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: mode, isMobile: width < 768 });
      const pg = await ctx.newPage();
      for (const page of PAGES) {
        const root = lang === "en" ? BASE + "en/" : BASE;
        await pg.goto(root + page.go, { waitUntil: "load" });
        // 상세 화면은 탭 바를 숨긴다. 준비됐는지는 #view 안에 내용이 생겼는지로 본다.
        await pg.waitForFunction(() => document.querySelector("#view") && document.querySelector("#view").children.length > 0, null, { timeout: 15000 });
        if (page.tab) await pg.click('.tab[data-tab="' + page.tab + '"]');
        await pg.waitForTimeout(150);
        const styles = await pg.evaluate(({ SELECTORS, PER_SELECTOR, PROPS }) => {
          const res = {};
          for (const sel of SELECTORS) {
            [...document.querySelectorAll(sel)].slice(0, PER_SELECTOR).forEach((el, i) => {
              const cs = getComputedStyle(el);
              for (const p of PROPS) res[sel + "[" + i + "]." + p] = cs.getPropertyValue(p);
            });
          }
          return res;
        }, { SELECTORS, PER_SELECTOR, PROPS });
        for (const [k, v] of Object.entries(styles)) out[[lang, mode, width, page.name, k].join("|")] = v;
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

const now = await snapshot();
fs.writeFileSync(OUT, JSON.stringify(now, null, 1), "utf8");
console.log("스냅숏 " + Object.keys(now).length + "개 값 → " + OUT);

if (BEFORE) {
  const before = JSON.parse(fs.readFileSync(BEFORE, "utf8"));
  const keys = new Set([...Object.keys(before), ...Object.keys(now)]);
  const diffs = [...keys].filter((k) => before[k] !== now[k]).sort();
  for (const k of diffs.slice(0, 200)) console.log("다름  " + k + "\n      전 " + before[k] + "\n      후 " + now[k]);
  console.log("차이 " + diffs.length + "개" + (diffs.length > 200 ? " (처음 200개만 표시)" : ""));
  process.exit(diffs.length ? 1 : 0);
}
