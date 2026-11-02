// 로컬 시험용 서버(배포에는 쓰지 않음). 폴더를 배포와 같은 /VCT-board/ 경로로 서비스한다.
// 실행: node scripts/dev-server.mjs [포트, 기본 8080] [폴더, 기본 저장소 루트]
// 없는 /VCT-board/p/*, /VCT-board/t/* 는 index.html 에 <base href="/VCT-board/"> 를 넣어 404 로 돌려준다(배포의 404.html 흉내).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toLang } from "./i18n-html.mjs";

const PREFIX = "/VCT-board/";
const port = Number(process.argv[2] || 8080);
const root = path.resolve(process.argv[3] || fileURLToPath(new URL("..", import.meta.url)));
// 서비스하는 것: 루트 index.html·404.html·sitemap.xml·og.png 와 css/, js/, data/, p/, t/ 아래. 그 밖은 404.
const SERVED = /^(|index\.html|404\.html|sitemap\.xml|og\.png|(css|js|data|p|t|en|privacy|terms|dev)(\/.*)?)$/;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon" };

function send(res, code, body, type, extra) {
  res.writeHead(code, Object.assign({ "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-store" }, extra));
  res.end(body);
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let p;
  try { p = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, "bad path"); }
  if (p === "/" || p === "/VCT-board") return send(res, 302, "", null, { Location: PREFIX + url.search + url.hash });
  if (!p.startsWith(PREFIX)) return send(res, 404, "not found");
  const sub = p.slice(PREFIX.length);
  // %2F 로 숨긴 ../ 도 막는다(디코딩 뒤에 생긴 상위 폴더 참조).
  if (sub.split("/").includes("..")) return send(res, 403, "forbidden");
  // 견본 화면(dev/styleguide.html)의 데이터: dev/fixtures/ 는 scripts/fixtures/ 를 가리킨다.
  const file = sub.startsWith("dev/fixtures/") ? path.join(root, "scripts", "fixtures", sub.slice("dev/fixtures/".length)) : path.join(root, sub);
  // 폴더 밖으로 나가는 경로(../)는 막는다.
  if (file !== root && !file.startsWith(root + path.sep)) return send(res, 403, "forbidden");
  // 배포 사이트에 올라가는 것만 서비스한다(.git, scripts, docs 등은 404). dev/ 는 개발 전용이라 여기서만 열린다.
  const rel = sub;
  if (!SERVED.test(rel)) return send(res, 404, "not found");
  let st = null;
  try { st = fs.statSync(file); } catch (e) {}
  // 영문 주소: 저장소에는 en/ 폴더가 없으니 한국어 틀을 영문으로 바꿔 보낸다(배포의 en/ 과 같은 모양). 만든 파일이 있으면 그것을 쓴다.
  const built = st && (st.isFile() || (st.isDirectory() && fs.existsSync(path.join(file, "index.html"))));
  if (/^\/VCT-board\/en(\/|$)/.test(p) && !built) {
    if (p === "/VCT-board/en") return send(res, 301, "", null, { Location: PREFIX + "en/" + url.search + url.hash });
    const shell = toLang(fs.readFileSync(path.join(root, "index.html"), "utf8"), "en").replace(/<head>/i, '<head><base href="/VCT-board/">');
    // 없는 상세 주소(en/p/…, en/t/…)는 404 로 보내고 화면은 "not found" 문구를 그린다.
    return send(res, /^\/VCT-board\/en\/[pt]\//.test(p) ? 404 : 200, shell, TYPES[".html"]);
  }
  if (st && st.isDirectory()) {
    if (!p.endsWith("/")) return send(res, 301, "", null, { Location: p + "/" + url.search });
    const idx = path.join(file, "index.html");
    if (fs.existsSync(idx)) return send(res, 200, fs.readFileSync(idx), TYPES[".html"]);
    st = null;
  }
  if (st && st.isFile()) return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
  if (/^\/VCT-board\/[pt]\//.test(p)) {
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/<head>/i, '<head><base href="/VCT-board/">');
    return send(res, 404, html, TYPES[".html"]);
  }
  send(res, 404, "not found");
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}${PREFIX} ← ${root}`));
