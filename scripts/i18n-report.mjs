// 본문 번역 현황표: 대상 필드별 원문 수, 번역 수(검사 통과), 누락 수. 예약 작업 점검과 같은 기준(i18n-targets.mjs)이다.
// 실행: node scripts/i18n-report.mjs [데이터 폴더, 기본 data/]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setEnTable, trEn } from "../js/i18n.js";
import { collectTargets } from "./i18n-targets.mjs";

const dir = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("../data/", import.meta.url));
const read = (f) => (fs.existsSync(path.join(dir, f + ".json")) ? JSON.parse(fs.readFileSync(path.join(dir, f + ".json"), "utf8")) : null);
const tr = read("i18n-en") || {};
setEnTable(tr);

const D = { players: read("players") || [], coaches: read("coaches") || [], transfers: read("transfers") || {}, watch: read("watch") || [], schedule: read("schedule") || [], sources: read("sources") || {} };
const targets = collectTargets(D);

const LABEL = {
  "players note": "선수 비고", "coaches note": "코치 비고", "transfers note": "이적 비고",
  "players team": "선수 팀 칸", "coaches team": "코치 팀 칸",
  "watch situation": "지켜볼 팀 상황", "schedule title": "일정 제목", "schedule date": "일정 날짜(글)",
  "schedule source": "일정 출처", "sources name": "출처 이름"
};
const rows = new Map();
for (const x of targets) {
  const k = x.file + " " + x.field;
  const r = rows.get(k) || { label: LABEL[k] || k, src: 0, ok: 0, miss: 0 };
  r.src += 1;
  if (trEn(x.key) !== null) r.ok += 1; else r.miss += 1;
  rows.set(k, r);
}
const pad = (s, n) => String(s).padEnd(n, " ");
console.log(pad("필드", 16) + pad("원문", 8) + pad("번역", 8) + "누락");
let src = 0, ok = 0, miss = 0;
for (const r of rows.values()) {
  console.log(pad(r.label, 16) + pad(r.src, 8) + pad(r.ok, 8) + r.miss);
  src += r.src; ok += r.ok; miss += r.miss;
}
console.log(pad("합계", 16) + pad(src, 8) + pad(ok, 8) + miss);
console.log("번역 표 항목 " + Object.keys(tr).length + "개, 지금 data 에 쓰이는 키 " + new Set(targets.map((x) => x.key)).size + "개");
