// 배포용 정적 페이지 생성. 사이트 파일을 출력 폴더에 복사하고, 인물·팀마다 한국어(p/, t/)와 영문(en/p/, en/t/) 페이지,
// 목록(index.html, en/index.html), sitemap.xml, 404.html 을 만든다. 한·영 짝은 hreflang 세 줄과 sitemap 의 xhtml:link 로 잇는다.
// 실행: node scripts/build.mjs [출력 폴더, 기본 _site]   (people·teams 가 없으면 상세 페이지 0개로 끝난다)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { esc, isoOf, TODAY } from "../js/format.js";
import { buildIndex, pillOf, pillText, routeOf, teamMoves, teamNameOf, newestFirst, regionName, ID_RE } from "../js/model.js";
import { setLang, tIn } from "../js/i18n.js";
import { termEn } from "../js/i18n/glossary.js";
import { toLang, addAlternates } from "./i18n-html.mjs";
import { prepareOut } from "./out-dir.mjs";
import { checkSitePath } from "./inline-script.mjs";

// 배포 경로와 주소. 이 파일에서 이 두 곳만 고치면 된다.
const SITE_PATH = "/VCT-board/";
const SITE_ORIGIN = "https://4nhackle.github.io";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
// 인자 없이 실행하면 저장소 안의 _site 를 쓴다. 인자 경로는 실행한 폴더 기준이다.
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "_site");

const read = (f, fallback) => {
  const p = path.join(ROOT, "data", f + ".json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback;
};
const D = {
  sources: read("sources", {}), players: read("players", []), coaches: read("coaches", []),
  transfers: read("transfers", { players: [], coaches: [] }), watch: read("watch", []),
  people: read("people", []), teams: read("teams", [])
};
for (const r of [...D.people, ...D.teams]) if (!ID_RE.test(String(r.id))) throw new Error("ID 형식이 맞지 않습니다: " + r.id);
// 상세 페이지를 만들 파일이 없으면 한 줄 알린다. 설계상 정상 상태라 빌드는 실패시키지 않는다.
if (!fs.existsSync(path.join(ROOT, "data", "people.json")) || !fs.existsSync(path.join(ROOT, "data", "teams.json"))) {
  console.warn("경고  상세 정적 페이지 0개(people/teams 없음)");
}
const IDX = buildIndex(D);

// 설명문과 제목은 화면과 같은 사전으로 만든다. 언어를 잠깐 바꿨다가 한국어로 되돌린다.
function inLang(lang, fn) {
  setLang(lang);
  try { return fn(); } finally { setLang("ko"); }
}
const suffix = (lang) => tIn(lang, "title.suffix");

// ── 설명문과 제목: 화면과 같은 규칙(pillOf, newestFirst)을 쓴다
function personName(id) {
  const p = IDX.people[id], top = (IDX.byPerson[id] || []).slice().sort(newestFirst)[0];
  return (p && p.name) || (top ? top.row.name : "") || id;
}
function personDesc(id, lang) {
  const name = personName(id), top = (IDX.byPerson[id] || []).slice().sort(newestFirst)[0];
  if (!top) return name;
  // 영문 설명문에는 한글 팀 칸을 넣지 않는다(용어집으로 못 옮기면 뺀다).
  const teamText = lang === "en" ? termEn(top.item.team) || "" : top.item.team;
  // 이동이면 "A → B 이적 확정|보도". 이적 행은 발표일로, 그 밖의 합류는 단계로 가른다.
  const r = routeOf(top.item, IDX.teams);
  if (r && r.kind === "move") {
    const word = top.kind === "t" ? (typeof top.row.signedDate === "number" ? tIn(lang, "desc.confirmed") : tIn(lang, "desc.reported")) : r.stage === "confirmed" ? tIn(lang, "desc.confirmed") : tIn(lang, "desc.reported");
    return name + " · " + [r.from, r.to].filter(Boolean).join(" → ") + tIn(lang, "desc.move") + word;
  }
  return [name, teamText, pillText(pillOf(top.item))].filter(Boolean).join(" · ");
}
function teamName(id) {
  const t = IDX.teams[id];
  return t && t.name ? t.name : teamNameOf(id, (IDX.byTeam[id] || []).slice().sort(newestFirst));
}
function teamDesc(id, lang) {
  const team = IDX.teams[id], m = teamMoves(id, IDX);
  return [teamName(id), team ? regionName(team.region) || team.region : "", tIn(lang, "desc.in", { n: m.incoming.length }), tIn(lang, "desc.out", { n: m.outgoing.length })].filter(Boolean).join(" · ");
}

// ── 페이지 틀: index.html 의 메타 태그만 바꾸고, head 맨 앞에 base 를 넣는다. 영문 틀은 toLang 으로 먼저 만든다.
const TPL = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
checkSitePath(TPL, SITE_PATH);
function setTag(html, re, tag) {
  if (!re.test(html)) throw new Error("index.html 에 없는 태그: " + re);
  return html.replace(re, tag);
}
function withBase(html) { return html.replace(/<head>/i, '<head><base href="' + SITE_PATH + '">'); }
function page(o) {
  let h = o.lang === "en" ? toLang(TPL, "en") : TPL;
  h = setTag(h, /<title>[^<]*<\/title>/, "<title>" + esc(o.title) + "</title>");
  h = setTag(h, /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(o.description) + '">');
  h = setTag(h, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(o.title) + '">');
  h = setTag(h, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(o.description) + '">');
  h = setTag(h, /<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + esc(o.url) + '">');
  h = setTag(h, /<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + esc(o.url) + '">');
  // 상세 페이지의 <h1> 은 이름 하나. 사이트 제목은 작은 줄로 바꾸고, 이름은 JS 가 그리기 전에도 보이게 #view 안에 미리 넣는다.
  h = setTag(h, /<h1 class="site" id="site"( data-i18n="site.heading")?>([^<]*)<\/h1>/, '<p class="site" id="site"$1>$2</p>');
  h = setTag(h, /<div id="view"><\/div>/, '<div id="view"><section class="detail-page"><header class="dp-head"><h1 class="dp-name">' + esc(o.name) + "</h1></header></section></div>");
  return addAlternates(withBase(h), o.alt);
}
const urlOf = (rel) => SITE_ORIGIN + SITE_PATH + rel;

// ── 출력 폴더: 사이트 파일 복사
try { prepareOut(OUT, ROOT, { allowSite: true }); } catch (e) { console.error(e.message); process.exit(2); }
for (const d of ["css", "js", "data"]) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
fs.copyFileSync(path.join(ROOT, "og.png"), path.join(OUT, "og.png"));

// 목록: 한국어는 index.html 에 짝 주소 세 줄만 더하고, 영문은 toLang 으로 만든 en/index.html 이다.
const indexAlt = { ko: urlOf(""), en: urlOf("en/") };
fs.writeFileSync(path.join(OUT, "index.html"), addAlternates(TPL, indexAlt));
fs.mkdirSync(path.join(OUT, "en"), { recursive: true });
let enIndex = toLang(TPL, "en");
enIndex = setTag(enIndex, /<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + esc(indexAlt.en) + '">');
enIndex = setTag(enIndex, /<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + esc(indexAlt.en) + '">');
fs.writeFileSync(path.join(OUT, "en", "index.html"), addAlternates(withBase(enIndex), indexAlt));

// ── 인물·팀 페이지: 한국어와 영문을 함께 만든다.
const entries = [{ loc: indexAlt.ko, alt: indexAlt }, { loc: indexAlt.en, alt: indexAlt }];
// 약관·개인정보: 한국어 원문과 영문 요약(저장소의 en/ 정적 파일)을 짝으로 낸다.
for (const doc of ["privacy", "terms"]) {
  const alt = { ko: urlOf(doc + "/"), en: urlOf("en/" + doc + "/") };
  for (const lang of ["ko", "en"]) {
    const src = lang === "ko" ? path.join(ROOT, doc, "index.html") : path.join(ROOT, "en", doc, "index.html");
    fs.mkdirSync(path.join(OUT, lang === "ko" ? doc : path.join("en", doc)), { recursive: true });
    fs.writeFileSync(path.join(OUT, lang === "ko" ? doc : path.join("en", doc), "index.html"), addAlternates(fs.readFileSync(src, "utf8"), alt));
    entries.push({ loc: alt[lang], alt });
  }
}
// rel: {ko, en} 두 주소. name: 이름(언어 공통). descOf(lang): 그 언어의 설명문.
function writePair(rel, name, descOf) {
  const alt = { ko: urlOf(rel.ko), en: urlOf(rel.en) };
  for (const lang of ["ko", "en"]) {
    fs.mkdirSync(path.join(OUT, rel[lang]), { recursive: true });
    fs.writeFileSync(path.join(OUT, rel[lang], "index.html"), page({
      lang, name, alt, url: alt[lang], title: name + suffix(lang), description: inLang(lang, () => descOf(lang))
    }));
    entries.push({ loc: alt[lang], alt });
  }
}
for (const p of D.people) {
  const id = p.id;
  writePair({ ko: "p/" + id + "/", en: "en/p/" + id + "/" }, personName(id), (lang) => personDesc(id, lang));
}
for (const t of D.teams) {
  const id = t.id;
  writePair({ ko: "t/" + id + "/", en: "en/t/" + id + "/" }, teamName(id), (lang) => teamDesc(id, lang));
}

// ── 사이트맵(빌드 날짜는 KST)과 404 대체 진입점
const lastmod = isoOf(TODAY);
const altLinks = (alt) => alt
  ? ['<xhtml:link rel="alternate" hreflang="ko" href="' + esc(alt.ko) + '"/>', '<xhtml:link rel="alternate" hreflang="en" href="' + esc(alt.en) + '"/>', '<xhtml:link rel="alternate" hreflang="x-default" href="' + esc(alt.ko) + '"/>'].map((x) => "\n    " + x).join("")
  : "";
fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  entries.map((e) => "  <url><loc>" + esc(e.loc) + "</loc><lastmod>" + lastmod + "</lastmod>" + altLinks(e.alt) + "</url>").join("\n") + "\n</urlset>\n");
fs.writeFileSync(path.join(OUT, "404.html"), withBase(TPL));

console.log(`빌드 완료: ${OUT} · 인물 ${D.people.length}쪽, 팀 ${D.teams.length}쪽 (각각 한·영), sitemap 주소 ${entries.length}개`);
