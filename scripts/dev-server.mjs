// 로컬 시험용 서버(배포에는 쓰지 않음). 폴더를 배포와 같은 /VCT-board/ 경로로 서비스한다.
// 실행: node scripts/dev-server.mjs [포트, 기본 8080] [폴더, 기본 저장소 루트]
// 없는 /VCT-board/p/*, /VCT-board/t/* 는 index.html 에 <base href="/VCT-board/"> 를 넣어 404 로 돌려준다(배포의 404.html 흉내).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PREFIX = "/VCT-board/";
const port = Number(process.argv[2] || 8080);
const root = path.resolve(process.argv[3] || fileURLToPath(new URL("..", import.meta.url)));
// 서비스하는 것: 루트 index.html·404.html·sitemap.xml·og.png 와 css/, js/, data/, p/, t/ 아래. 그 밖은 404.
const SERVED = /^(|index\.html|404\.html|sitemap\.xml|og\.png|(css|js|data|p|t)(\/.*)?)$/;
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
  const file = path.join(root, p.slice(PREFIX.length));
  // 폴더 밖으로 나가는 경로(../)는 막는다.
  if (file !== root && !file.startsWith(root + path.sep)) return send(res, 403, "forbidden");
  // 배포 사이트에 올라가는 것만 서비스한다(.git, scripts, docs 등은 404).
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (!SERVED.test(rel)) return send(res, 404, "not found");
  let st = null;
  try { st = fs.statSync(file); } catch (e) {}
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
