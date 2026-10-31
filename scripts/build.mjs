// 배포용 정적 페이지 생성. 사이트 파일을 출력 폴더에 복사하고, 인물·팀마다 p/<id>/, t/<id>/ 페이지와 sitemap.xml, 404.html 을 만든다.
// 실행: node scripts/build.mjs [출력 폴더, 기본 _site]   (people·teams 가 없으면 상세 페이지 0개로 끝난다)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { esc, isoOf, TODAY } from "../js/format.js";
import { buildIndex, pillOf, teamMoves, teamNameOf, newestFirst, REGION_KO, ID_RE } from "../js/model.js";

// 배포 경로와 주소. 이 파일에서 이 두 곳만 고치면 된다.
const SITE_PATH = "/VCT-board/";
const SITE_ORIGIN = "https://4nhackle.github.io";
const TITLE_SUFFIX = " · VCT LFT·FA 현황";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUT = path.resolve(process.argv[2] || "_site");
if (OUT === ROOT.slice(0, -1) || ROOT.startsWith(OUT + path.sep)) { console.error("출력 폴더가 저장소 루트를 포함합니다: " + OUT); process.exit(2); }

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
const IDX = buildIndex(D);

// ── 설명문과 제목: 화면과 같은 규칙(pillOf, newestFirst)을 쓴다
function personName(id) {
  const p = IDX.people[id], top = (IDX.byPerson[id] || []).slice().sort(newestFirst)[0];
  return (p && p.name) || (top ? top.row.name : "") || id;
}
function personDesc(id) {
  const name = personName(id), top = (IDX.byPerson[id] || []).slice().sort(newestFirst)[0];
  if (!top) return name;
  if (top.kind === "t") {
    const route = [top.item.team, top.item.next].filter(Boolean).join(" → ");
    return name + " · " + route + " 이적 " + (typeof top.row.signedDate === "number" ? "확정" : "보도");
  }
  return [name, top.item.team, pillOf(top.item)[1]].filter(Boolean).join(" · ");
}
function teamName(id) {
  const t = IDX.teams[id];
  return t && t.name ? t.name : teamNameOf(id, (IDX.byTeam[id] || []).slice().sort(newestFirst));
}
function teamDesc(id) {
  const t = IDX.teams[id], m = teamMoves(id, IDX);
  return [teamName(id), t ? REGION_KO[t.region] || t.region : "", "들어온 " + m.incoming.length + "명", "나간 " + m.outgoing.length + "명"].filter(Boolean).join(" · ");
}

// ── 페이지 틀: index.html 의 메타 태그만 바꾸고, head 맨 앞에 base 를 넣는다
const TPL = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
function setTag(html, re, tag) {
  if (!re.test(html)) throw new Error("index.html 에 없는 태그: " + re);
  return html.replace(re, tag);
}
function withBase(html) { return html.replace(/<head>/i, '<head><base href="' + SITE_PATH + '">'); }
function page(o) {
  let h = TPL;
  h = setTag(h, /<title>[^<]*<\/title>/, "<title>" + esc(o.title) + "</title>");
  h = setTag(h, /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(o.description) + '">');
  h = setTag(h, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(o.title) + '">');
  h = setTag(h, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(o.description) + '">');
  h = setTag(h, /<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + esc(o.url) + '">');
  h = setTag(h, /<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + esc(o.url) + '">');
  return withBase(h);
}
const urlOf = (rel) => SITE_ORIGIN + SITE_PATH + rel;

// ── 출력 폴더: 사이트 파일 복사
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(ROOT, "index.html"), path.join(OUT, "index.html"));
fs.copyFileSync(path.join(ROOT, "og.png"), path.join(OUT, "og.png"));
for (const d of ["css", "js", "data"]) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });

// ── 인물·팀 페이지
const urls = [urlOf("")];
for (const p of D.people) {
  const rel = "p/" + p.id + "/", title = personName(p.id) + TITLE_SUFFIX;
  fs.mkdirSync(path.join(OUT, rel), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel, "index.html"), page({ title, description: personDesc(p.id), url: urlOf(rel) }));
  urls.push(urlOf(rel));
}
for (const t of D.teams) {
  const rel = "t/" + t.id + "/", title = teamName(t.id) + TITLE_SUFFIX;
  fs.mkdirSync(path.join(OUT, rel), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel, "index.html"), page({ title, description: teamDesc(t.id), url: urlOf(rel) }));
  urls.push(urlOf(rel));
}

// ── 사이트맵(빌드 날짜는 KST)과 404 대체 진입점
const lastmod = isoOf(TODAY);
fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => "  <url><loc>" + esc(u) + "</loc><lastmod>" + lastmod + "</lastmod></url>").join("\n") + "\n</urlset>\n");
fs.writeFileSync(path.join(OUT, "404.html"), withBase(TPL));

console.log(`빌드 완료: ${OUT} · 인물 ${D.people.length}쪽, 팀 ${D.teams.length}쪽, sitemap 주소 ${urls.length}개`);
