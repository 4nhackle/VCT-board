// 인물별 빈 정보 현황. data/ 를 읽기만 하고 표준 출력에만 쓴다(data/ 에는 아무것도 쓰지 않는다).
// 실행: node scripts/gaps.mjs            항목별 빈 칸 수 표
//       node scripts/gaps.mjs --json     예약 작업이 쓰는 목록 [{ id, name, kind, team, missing, vlr, liquipedia }]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex, cleanName, contractOK, newestFirst } from "../js/model.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (f, fallback) => {
  const p = path.join(ROOT, "data", f + ".json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback;
};

// 빈 항목 키와 표의 이름. 키는 --json 의 missing 에 그대로 나간다.
export const GAP_LABELS = { birth: "생년월일", role: "포지션·역할", nationality: "국적", realName: "본명", career: "경력", vlr: "VLR", liquipedia: "Liquipedia", contract: "계약 만료" };

// 인물 한 명의 빈 항목 키 목록. "-" 도 빈 칸이다(cleanName).
export function gapsOf(p) {
  const links = p.links || {}, out = [];
  if (!cleanName(p.birth)) out.push("birth");
  if (!cleanName(p.role)) out.push("role");
  if (!cleanName(p.nationality)) out.push("nationality");
  if (!cleanName(p.realName)) out.push("realName");
  if (!(Array.isArray(p.career) && p.career.length)) out.push("career");
  if (!cleanName(links.vlr)) out.push("vlr");
  if (!cleanName(links.liquipedia)) out.push("liquipedia");
  if (!contractOK(p.contractUntil)) out.push("contract");
  return out;
}

function main(args) {
  const D = { sources: read("sources", {}), players: read("players", []), coaches: read("coaches", []), transfers: read("transfers", { players: [], coaches: [] }), watch: read("watch", []), people: read("people", []), teams: read("teams", []) };
  const IDX = buildIndex(D);
  const rows = D.people.map((p) => {
    const news = (IDX.byPerson[p.id] || []).slice().sort(newestFirst);
    return { p, missing: gapsOf(p), current: news.length > 0, team: news.length ? cleanName(news[0].item.team) : "" };
  });
  // 빈 항목이 많은 순, 같으면 현재 소식(LFT·이적)에 나오는 인물을 먼저 둔다.
  const list = rows.filter((r) => r.missing.length).sort((a, b) => b.missing.length - a.missing.length || Number(b.current) - Number(a.current));
  if (args.includes("--json")) {
    console.log(JSON.stringify(list.map((r) => ({ id: r.p.id, name: r.p.name, kind: r.p.kind, team: r.team, missing: r.missing, vlr: cleanName((r.p.links || {}).vlr), liquipedia: cleanName((r.p.links || {}).liquipedia) })), null, 2));
    return;
  }
  const of = (kind) => rows.filter((r) => r.p.kind === kind).length;
  const cnt = (key, kind) => rows.filter((r) => r.p.kind === kind && r.missing.includes(key)).length;
  console.log(`인물 ${rows.length}명 (선수 ${of("player")}명, 코치 ${of("coach")}명), 빈 항목이 있는 인물 ${list.length}명`);
  console.log(["항목", "선수", "코치", "합계"].join(" | "));
  for (const key of Object.keys(GAP_LABELS)) {
    const a = cnt(key, "player"), b = cnt(key, "coach");
    console.log([GAP_LABELS[key], a, b, a + b].join(" | "));
  }
}

// 다른 스크립트(validate.mjs)가 가져다 쓸 때는 실행하지 않는다.
if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
