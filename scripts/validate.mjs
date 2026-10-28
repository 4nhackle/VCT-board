// data/*.json 점검: 출처 키, 지역 값, 중복, 쓰이지 않는 출처. 실행: node scripts/validate.mjs
import fs from "node:fs";
import { REGIONS, toItem, pillOf } from "../js/model.js";
import { stampOf } from "../js/format.js";

const read = (f) => JSON.parse(fs.readFileSync(new URL("../data/" + f + ".json", import.meta.url), "utf8"));
const sources = read("sources");
const transfers = read("transfers");
const sets = {
  players: read("players"),
  coaches: read("coaches"),
  "transfers.players": transfers.players,
  "transfers.coaches": transfers.coaches,
  watch: read("watch")
};
const kindOf = { players: "player", coaches: "coach", "transfers.players": "t", "transfers.coaches": "t" };

const errors = [], warns = [], used = new Set();

for (const [key, [label, url]] of Object.entries(sources)) {
  if (!label) errors.push(`sources.${key}: 이름이 비었습니다`);
  if (!/^https?:\/\//i.test(url)) errors.push(`sources.${key}: 주소가 http(s)가 아닙니다 (${url})`);
}

for (const [file, rows] of Object.entries(sets)) {
  const seen = new Map();
  rows.forEach((r, i) => {
    const at = `${file}[${i}] ${r.name || r.team || ""}`;
    if (!REGIONS.includes(r.region)) errors.push(`${at}: 지역 "${r.region}" 이(가) REGIONS에 없습니다`);
    if (!(r.src in sources)) errors.push(`${at}: 출처 키 "${r.src}" 이(가) sources.json에 없습니다`);
    else used.add(r.src);
    if ("date" in r && typeof r.date !== "number") warns.push(`${at}: 날짜가 숫자(시트 일련번호)가 아닙니다`);
    if ("conf" in r && !["C", "R"].includes(r.conf)) errors.push(`${at}: conf "${r.conf}" 은(는) C나 R이어야 합니다`);
    if (kindOf[file]) {
      const it = toItem(r, kindOf[file], sources);
      if (pillOf(it)[0] === "unknown") warns.push(`${at}: 상태 "${it.status}" 을(를) 화면이 읽지 못해 "확인 필요"로 나옵니다`);
      if (/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\s*(UTC|KST)/.test(it.note || "") && stampOf(it) === null) warns.push(`${at}: 비고의 보도 시각이 날짜 칸과 맞지 않아 화면에서 빠집니다`);
    }
    const id = [r.team, r.name, r.targets].join("|").toLowerCase();
    if (seen.has(id)) errors.push(`${at}: ${seen.get(id)}번째 행과 중복입니다`);
    else seen.set(id, i);
  });
}

for (const key of Object.keys(sources)) if (!used.has(key)) warns.push(`sources.${key}: 어디에서도 쓰이지 않습니다`);

warns.forEach((w) => console.warn("경고  " + w));
errors.forEach((e) => console.error("오류  " + e));
console.log(`출처 ${Object.keys(sources).length}개, 행 ${Object.values(sets).reduce((n, r) => n + r.length, 0)}개 점검: 오류 ${errors.length}, 경고 ${warns.length}`);
process.exit(errors.length ? 1 : 0);
