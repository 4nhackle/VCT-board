// 스타일 자동 점검(Node 만 씀). css/style.css 를 읽어 네 가지를 본다.
//   1. 중복 선택자: 같은 미디어 조건 안에서 같은 선택자가 두 번 나오면 실패. :root·테마 블록은 제외.
//   2. 날것의 값: :root·테마 블록 밖에서 #색, rgb()/hsl(), px 크기(테두리·윤곽선 1~3px 제외), 기본값 토큰(--fs-·--sp-·--r-·원색) 직접 사용.
//      --이름: 선언(컴포넌트 토큰)에서는 날것의 값을 허용한다. 대신 기본값 토큰은 여기서도 막는다.
//   3. 대비: :root(라이트)와 강제 다크 블록의 의미 색을 풀어 WCAG 대비를 계산한다. 본문 쌍 4.5:1, 테두리·아이콘 쌍 3:1.
//   4. 터치 크기: 600px 이하에서 --tap(= --control-h)이 44px 이상이어야 한다.
// 실행: node scripts/css-check.mjs [css 파일]   (실패하면 종료 코드 1)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── 파서: 주석 제거, 미디어 블록은 한 단계 안으로, 나머지는 선택자 {선언}
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ""); }

function parseBlocks(css, media, out) {
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const prelude = css.slice(i, open).trim();
    // 본문 끝 찾기(중괄호 짝)
    let depth = 1, j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);
    if (prelude.startsWith("@media")) parseBlocks(body, prelude, out);
    else if (!prelude.startsWith("@")) out.push({ media, selector: prelude, body });
    i = j;
  }
  return out;
}

// 선언 나누기: 괄호와 따옴표 안의 ; 는 무시한다.
function declarations(body) {
  const out = [];
  let cur = "", depth = 0, quote = null;
  for (const ch of body) {
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === ";" && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((d) => {
    const k = d.indexOf(":");
    return k < 0 ? null : { prop: d.slice(0, k).trim(), value: d.slice(k + 1).trim() };
  }).filter(Boolean);
}

const isThemeRule = (sel) => /(^|,)\s*:root/.test(sel);
const normSel = (s) => s.replace(/\s+/g, " ").trim();

// ── 1. 중복 선택자
function checkDuplicates(rules, failures) {
  const seen = new Map(); // "media|selector" → 처음 나온 위치
  rules.forEach((r, n) => {
    if (isThemeRule(r.selector)) return;
    for (const one of r.selector.split(",").map(normSel)) {
      const key = r.media + "|" + one;
      if (seen.has(key)) failures.push(`중복 선택자: "${one}" 이 규칙 ${seen.get(key) + 1}과 ${n + 1}에 같은 미디어 조건(${r.media || "기본"})으로 있다`);
      else seen.set(key, n);
    }
  });
}

// ── 2. 날것의 값
const DEFAULT_TOKEN = /var\(\s*--(fs-|sp-|r-|neutral-|coral-|green-|amber-|slate-|plum-|shadow-float-prim)/;
// 테두리·윤곽선 두께만 px 를 허용한다(1~3px). 0 은 항상 허용.
const BORDER_PROP = /^(border(-(top|right|bottom|left))?(-width)?|outline(-width)?)$/;
function checkRawValues(rules, failures) {
  for (const r of rules) {
    if (isThemeRule(r.selector)) continue;
    for (const { prop, value } of declarations(r.body)) {
      const noUrl = value.replace(/url\([^)]*\)/g, "url()");
      if (DEFAULT_TOKEN.test(noUrl)) failures.push(`기본값 토큰 직접 사용: ${r.selector} { ${prop}: ${value} } → 의미 토큰(--text-, --space-, --radius-, --color-, --status-)을 쓴다`);
      if (prop.startsWith("--")) continue; // 컴포넌트 토큰 선언: 날것의 값 허용
      if (/#[0-9a-fA-F]{3,8}\b/.test(noUrl)) failures.push(`날것의 색: ${r.selector} { ${prop}: ${value} }`);
      if (/\b(rgb|rgba|hsl|hsla)\(/.test(noUrl)) failures.push(`날것의 색 함수: ${r.selector} { ${prop}: ${value} }`);
      for (const m of noUrl.matchAll(/(-?\d*\.?\d+)px\b/g)) {
        const px = Math.abs(parseFloat(m[1]));
        if (px === 0) continue;
        if (BORDER_PROP.test(prop) && px >= 1 && px <= 3) continue;
        failures.push(`날것의 px: ${r.selector} { ${prop}: ${value} } → 토큰을 쓴다`);
        break;
      }
    }
  }
}

// ── 3. 대비
function parseHex(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}
const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function luminance(hex) { const [r, g, b] = parseHex(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// 토큰 풀이: var(--x) 를 값으로 바꾼다(:root 선언 기준, 테마 블록이 덮어쓴 값을 쓴다).
function resolveTokens(decls) {
  const resolve = (value, depth = 0) => {
    if (depth > 10) return value;
    return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (all, name, fb) => {
      if (decls[name] !== undefined) return resolve(decls[name], depth + 1);
      return fb !== undefined ? resolve(fb, depth + 1) : all;
    });
  };
  const out = {};
  for (const k of Object.keys(decls)) out[k] = resolve(decls[k]);
  return out;
}

function themeDecls(rules, selectorTest, mediaTest) {
  const decls = {};
  for (const r of rules) {
    if (!isThemeRule(r.selector) || !selectorTest(r.selector)) continue;
    if (!mediaTest(r.media)) continue;
    for (const { prop, value } of declarations(r.body)) if (prop.startsWith("--")) decls[prop] = value;
  }
  return decls;
}

// 본문 쌍(4.5:1)과 테두리·아이콘 쌍(3:1). 이름은 2층 의미 토큰이다.
const TEXT_PAIRS = [
  ["--color-ink", "--surface"], ["--color-ink", "--color-bg"], ["--color-mute", "--color-bg"], ["--color-mute", "--surface"],
  ["--color-accent", "--color-bg"], ["--color-on-accent", "--color-accent"], ["--color-bg", "--color-ink"],
  ["--status-open-fg", "--status-open-bg"], ["--status-signed-fg", "--status-signed-bg"], ["--status-left-fg", "--status-left-bg"], ["--status-warn-fg", "--status-warn-bg"],
  ["--color-mono-fg", "--color-mono-bg"]
];
const EDGE_PAIRS = [
  ["--color-line-strong", "--color-bg"], ["--status-open-rail", "--surface"], ["--status-signed-rail", "--surface"], ["--status-left-rail", "--surface"]
];

function checkContrast(rules, failures) {
  const lightDecls = themeDecls(rules, (s) => s === ":root", () => true);
  const light = resolveTokens(lightDecls);
  // 다크: 라이트의 의미 토큰은 그대로 두고 1층 값만 강제 다크 블록이 덮는다.
  const dark = resolveTokens({ ...lightDecls, ...themeDecls(rules, (s) => s.includes('[data-theme="dark"]'), () => true) });
  for (const [name, t] of [["라이트", light], ["다크", dark]]) {
    const check = (pairs, min) => {
      for (const [a, b] of pairs) {
        const ca = t[a], cb = t[b];
        if (!ca || !cb || !/^#/.test(ca) || !/^#/.test(cb)) { failures.push(`대비 쌍을 풀 수 없다(${name}): ${a} / ${b}`); continue; }
        const ratio = contrast(ca, cb);
        if (ratio < min) failures.push(`대비 부족(${name}): ${a} ${ca} / ${b} ${cb} = ${ratio.toFixed(2)}:1, 필요 ${min}:1`);
      }
    };
    check(TEXT_PAIRS, 4.5);
    check(EDGE_PAIRS, 3);
  }
}

// ── 4. 터치 크기
function checkTouch(rules, failures) {
  const mobile = themeDecls(rules, (s) => s === ":root", (m) => /max-width:\s*600px/.test(m));
  const tap = mobile["--tap"] || themeDecls(rules, (s) => s === ":root", () => true)["--tap"];
  const px = tap && parseFloat(tap);
  if (!tap || !(px >= 44)) failures.push(`터치 크기: 600px 이하의 --tap 이 44px 이상이어야 한다(지금 ${tap})`);
}

export function checkCss(css) {
  const rules = parseBlocks(stripComments(css), "", []);
  const failures = [];
  checkDuplicates(rules, failures);
  checkRawValues(rules, failures);
  checkContrast(rules, failures);
  checkTouch(rules, failures);
  return failures;
}

// 직접 실행: node scripts/css-check.mjs [파일]
if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("../css/style.css", import.meta.url));
  const failures = checkCss(fs.readFileSync(file, "utf8"));
  for (const f of failures) console.error("실패  " + f);
  console.log(failures.length ? `스타일 점검 실패 ${failures.length}건` : "스타일 점검 통과");
  process.exit(failures.length ? 1 : 0);
}
