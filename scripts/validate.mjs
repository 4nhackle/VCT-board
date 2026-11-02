// data/*.json 점검: 출처 키, 지역 값, 중복, 쓰이지 않는 출처. people·teams 가 있으면 인물·팀 참조와 형식도 본다.
// 실행: node scripts/validate.mjs [데이터 폴더, 기본 data/]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REGIONS, toItem, pillOf, idsOf, ID_RE, slugOf } from "../js/model.js";
import { stampOf, daysIn } from "../js/format.js";
import { setEnTable, trEn } from "../js/i18n.js";
import { collectTargets } from "./i18n-targets.mjs";
import { noteParts } from "../js/note.js";
import { gapsOf } from "./gaps.mjs";

const dir = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL("../data/", import.meta.url));
const has = (f) => fs.existsSync(path.join(dir, f + ".json"));
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f + ".json"), "utf8"));
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
// 경고는 어디서(where)·무엇(kind)·문장(text)으로 모은다. 많으면 종류별 개수만 보여 준다.
const warn = (where, kind, text) => warns.push({ where, kind, text });

for (const [key, [label, url]] of Object.entries(sources)) {
  if (!label) errors.push(`sources.${key}: 이름이 비었습니다`);
  if (!/^https?:\/\//i.test(url)) errors.push(`sources.${key}: 주소가 http(s)가 아닙니다 (${url})`);
}

for (const [file, rows] of Object.entries(sets)) {
  const seen = new Map();
  rows.forEach((r, i) => {
    const at = `${file}[${i}] ${r.name || r.team || ""}`;
    if (!REGIONS.includes(r.region)) errors.push(`${at}: 지역 "${r.region}" 이(가) REGIONS에 없습니다`);
    if (!Object.prototype.hasOwnProperty.call(sources, r.src)) errors.push(`${at}: 출처 키 "${r.src}" 이(가) sources.json에 없습니다`);
    else used.add(r.src);
    if ("date" in r && typeof r.date !== "number") warn(file, "날짜 형식", `${at}: 날짜가 숫자(시트 일련번호)가 아닙니다`);
    if ("conf" in r && !["C", "R"].includes(r.conf)) errors.push(`${at}: conf "${r.conf}" 은(는) C나 R이어야 합니다`);
    if (kindOf[file]) {
      const it = toItem(r, kindOf[file], sources);
      if (pillOf(it)[0] === "unknown") warn(file, "상태 읽기", `${at}: 상태 "${it.status}" 을(를) 화면이 읽지 못해 "확인 필요"로 나옵니다`);
      const sm = /(\d{1,2})\/(\d{1,2})\s+\d{1,2}:\d{2}\s*(UTC|KST)/.exec(it.note || "");
      if (sm && +sm[1] >= 1 && +sm[1] <= 12 && +sm[2] > daysIn(+sm[1])) warn(file, "비고 시각", `${at}: 보도 시각 ${sm[1]}/${sm[2]} 는 없는 날짜입니다. 비고의 날짜를 고치세요`);
      else if (sm && stampOf(it) === null) warn(file, "비고 시각", `${at}: 비고의 보도 시각(M/D)이 날짜 칸과 다른 날이라 날짜 옆 시각 표시만 빠집니다(출처 줄에는 나옵니다). 날짜 칸이나 비고 중 하나가 틀렸는지 확인하세요`);
    }
    const id = [r.team, r.name, r.targets].join("|").toLowerCase();
    if (seen.has(id)) errors.push(`${at}: ${seen.get(id)}번째 행과 중복입니다`);
    else seen.set(id, i);
  });
}

for (const key of Object.keys(sources)) if (!used.has(key)) warn("sources", "쓰이지 않음", `sources.${key}: 어디에서도 쓰이지 않습니다`);

// ── 인물·팀 (people.json, teams.json 이 있을 때만 점검한다)
const hasPeople = has("people"), hasTeams = has("teams");
const people = hasPeople ? read("people") : [];
const teams = hasTeams ? read("teams") : [];
const pIds = new Set(), tIds = new Set();

// 경력 기간 형식: yyyy-mm, 월은 01~12.
const YM = /^\d{4}-(0[1-9]|1[0-2])$/;

// 생년: "yyyy" 또는 실제 있는 "yyyy-mm-dd" 만 허용한다.
function validBirth(s) {
  if (/^\d{4}$/.test(s)) return true;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function checkDefs(label, rows, set) {
  rows.forEach((r, i) => {
    const at = `${label}[${i}] ${r.id || ""}`;
    if (!ID_RE.test(String(r.id || ""))) errors.push(`${at}: ID 형식이 맞지 않습니다 (^[a-z0-9-]+$)`);
    if (set.has(r.id)) errors.push(`${at}: ID "${r.id}" 이(가) ${label}.json 안에서 중복입니다`);
    else set.add(r.id);
  });
}
if (hasTeams) checkDefs("teams", teams, tIds);
if (hasPeople) checkDefs("people", people, pIds);

// 참조 값: 형식은 항상, 존재 여부는 그 파일이 있을 때만 본다.
function ref(at, field, value, set, label) {
  if (!ID_RE.test(String(value))) errors.push(`${at}: ${field} "${value}" 의 ID 형식이 맞지 않습니다`);
  else if (set && !set.has(value)) errors.push(`${at}: ${field} "${value}" 이(가) ${label}.json 에 없습니다`);
}
for (const [file, rows] of Object.entries(sets)) {
  rows.forEach((r, i) => {
    const at = `${file}[${i}] ${r.name || r.team || ""}`;
    if (r.personId !== undefined) ref(at, "personId", r.personId, hasPeople && pIds, "people");
    if (file === "watch") {
      if (r.teamIds !== undefined && !Array.isArray(r.teamIds)) errors.push(`${at}: teamIds 는 배열이어야 합니다`);
      for (const t of [].concat(r.teamIds || [])) ref(at, "teamIds", t, hasTeams && tIds, "teams");
    } else {
      for (const f of ["teamId", "fromTeam", "toTeam"]) if (r[f] !== undefined) ref(at, f, r[f], hasTeams && tIds, "teams");
    }
    if (r.contractUntil !== undefined && typeof r.contractUntil !== "number") errors.push(`${at}: contractUntil 은 시트 일련번호(숫자)여야 합니다`);
    if (r.signedDate !== undefined && typeof r.signedDate !== "number") errors.push(`${at}: signedDate 는 시트 일련번호(숫자)여야 합니다`);
  });
}

if (hasPeople) {
  people.forEach((p) => {
    const at = `people ${p.id}`;
    if (p.birth !== undefined && !validBirth(String(p.birth))) errors.push(`${at}: birth "${p.birth}" 은(는) yyyy 또는 yyyy-mm-dd 여야 합니다`);
    if (p.contractUntil !== undefined && typeof p.contractUntil !== "number") errors.push(`${at}: contractUntil 은 시트 일련번호(숫자)여야 합니다`);
    for (const c of p.career || []) {
      if (hasTeams && !tIds.has(c.team)) errors.push(`${at}: career.team "${c.team}" 이(가) teams.json 에 없습니다`);
      else if (!ID_RE.test(String(c.team))) errors.push(`${at}: career.team "${c.team}" 의 ID 형식이 맞지 않습니다`);
      // 기간은 yyyy-mm(월 01~12). 끝이 없으면(null) 진행 중이다. 화면에 그대로 나가므로 형식을 엄격히 본다.
      if (!YM.test(String(c.from || ""))) errors.push(`${at}: career.from "${c.from}" 은(는) yyyy-mm 이어야 합니다`);
      if (c.to != null && !YM.test(String(c.to))) errors.push(`${at}: career.to "${c.to}" 은(는) yyyy-mm 또는 null 이어야 합니다`);
      // 끝이 시작보다 앞서면 안 된다(yyyy-mm 은 글자 순서가 날짜 순서와 같다).
      if (YM.test(String(c.from || "")) && YM.test(String(c.to || "")) && String(c.to) < String(c.from)) errors.push(`${at}: career.to "${c.to}" 은(는) from 보다 앞설 수 없습니다`);
    }
    // 경력 기간 겹침: 시작 순으로 보고, 앞 칸이 끝나기 전에 다음 칸이 시작하면 경고.
    const c = [...(p.career || [])].sort((a, b) => ((a.from || "") < (b.from || "") ? -1 : 1));
    for (let i = 1; i < c.length; i++) {
      const prev = c[i - 1];
      if (prev.to == null || c[i].from <= prev.to) warn("people", "경력 겹침", `${at}: career 기간이 겹칩니다 (${prev.from}~${prev.to ?? "현재"} · ${c[i].from}~)`);
    }
  });

  // 소식에 나오는 인물이 people 에 없거나 국적·역할이 빈 칸이면 경고한다.
  const seenPid = new Map();
  for (const [file, rows] of Object.entries(sets)) {
    if (file === "watch") continue;
    rows.forEach((r, i) => {
      const pid = idsOf(r, kindOf[file]).pid;
      if (!seenPid.has(pid)) seenPid.set(pid, `${file}[${i}] ${r.name || ""}`);
    });
  }
  for (const [pid, at] of seenPid) {
    const p = people.find((x) => x.id === pid);
    if (!p) warn("news", "인물 행 없음", `${at}: 인물 "${pid}" 의 people 행이 없습니다`);
    else if (!String(p.nationality || "").trim() || p.nationality === "-" || !String(p.role || "").trim() || p.role === "-") warn("people", "국적·역할 빈 칸", `people ${pid}: 국적 또는 역할이 빈 칸입니다`);
  }
}

// ── 같은 ID 가 되는 서로 다른 이름·팀 (경고만). slugOf 는 대소문자·악센트·기호를 지워서 "ZYZZ"와 "zyzz"가 한 ID 가 된다.
// 같은 글자가 여러 행에 나오는 것은 정상이라 경고하지 않는다. "-" 와 빈 칸은 이름이 없는 것이다.
function clashes(list, what, tail) {
  const byId = new Map();
  for (const { text, where } of list) {
    const id = slugOf(text);
    if (!byId.has(id)) byId.set(id, new Map());
    const forms = byId.get(id);
    if (!forms.has(text)) forms.set(text, []);
    forms.get(text).push(where);
  }
  for (const [id, forms] of byId) {
    if (forms.size < 2) continue;
    const parts = [...forms].map(([text, wheres]) => `'${text}'(${wheres[0]}${wheres.length > 1 ? ` 외 ${wheres.length - 1}건` : ""})`);
    warn(what, what + " 충돌", `${what} ${parts.join(", ")}가 같은 ID '${id}'가 됩니다. ${tail}`);
  }
}
const nameOk = (v) => v != null && String(v).trim() !== "" && String(v).trim() !== "-";
const nameList = [];
for (const file of ["players", "coaches", "transfers.players", "transfers.coaches"]) {
  sets[file].forEach((r, i) => { if (!r.personId && nameOk(r.name)) nameList.push({ text: String(r.name).trim(), where: `${file} ${i + 1}행` }); });
}
if (hasPeople) {
  for (const p of people) for (const nm of [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])]) if (nameOk(nm)) nameList.push({ text: String(nm).trim(), where: `people ${p.id}` });
}
clashes(nameList, "인물 이름", "같은 사람이면 표기를 맞추고, 다른 사람이면 인물ID를 따로 지정하세요");
const teamList = [];
for (const file of ["players", "coaches"]) {
  sets[file].forEach((r, i) => { if (!r.teamId && nameOk(r.team)) teamList.push({ text: String(r.team).trim(), where: `${file} ${i + 1}행` }); });
}
for (const file of ["transfers.players", "transfers.coaches"]) {
  sets[file].forEach((r, i) => {
    const at = `${file}[${i}] ${r.name}`;
    // 도착 팀이 비면 오류(잔류는 도착이 원래 비므로 제외). 출발 팀이 비면 경고(확인 전의 행이 있을 수 있다).
    if (!/잔류/.test(r.type || "") && !nameOk(r.to)) errors.push(`${at}: 새 팀(to)이 비어 있습니다. 시트 '성사된 이적'의 새 팀 칸을 채우세요`);
    if (!nameOk(r.from)) warn(file, "이전 팀", `${at}: 이전 팀(from)이 비어 있습니다. 확인되면 시트 '성사된 이적'에 채우세요`);
    if (!r.fromTeam && nameOk(r.from)) teamList.push({ text: String(r.from).trim(), where: `${file} ${i + 1}행` });
    if (!r.toTeam && nameOk(r.to)) teamList.push({ text: String(r.to).trim(), where: `${file} ${i + 1}행` });
  });
}
sets.watch.forEach((r, i) => {
  if (!r.teamIds) for (const t of String(r.team || "").split(" / ")) if (nameOk(t)) teamList.push({ text: t.trim(), where: `watch ${i + 1}행` });
});
clashes(teamList, "팀 이름", "같은 팀이면 표기를 맞추고, 다른 팀이면 팀ID를 따로 지정하세요");

// ── 영문 본문 번역 표(data/i18n-en.json, 있을 때만). 배포를 막지 않도록 경고만 낸다.
if (fs.existsSync(path.join(dir, "i18n-en.json"))) {
  let tr = null;
  try { tr = JSON.parse(fs.readFileSync(path.join(dir, "i18n-en.json"), "utf8")); } catch (e) { warn("i18n-en.json", "형식", "data/i18n-en.json 이 JSON 형식이 아닙니다: " + e.message); }
  if (tr && typeof tr === "object" && !Array.isArray(tr)) {
    setEnTable(tr);
    const D = { players: sets.players, coaches: sets.coaches, transfers, watch: sets.watch, sources, schedule: has("schedule") ? read("schedule") : [] };
    const targets = collectTargets(D);
    const keys = new Set(targets.map((x) => x.key));
    const hangul = Object.keys(tr).filter((k) => /[가-힣]/.test(noteParts(String(tr[k])).body));
    if (hangul.length) warn("i18n-en.json", "영문에 한글", `영문 번역에 한글이 남은 항목 ${hangul.length}건. 예약 작업이 다음 실행에서 다시 채웁니다`);
    const failed = Object.keys(tr).filter((k) => trEn(k) === null);
    if (failed.length) {
      warn("i18n-en.json", "검사 실패", `번역 검사에 걸린 항목 ${failed.length}건(보도 시각·교차 확인·숫자 불일치). 화면은 원문 + KR 로 보입니다`);
      failed.slice(0, 10).forEach((k) => warn("i18n-en.json", "검사 실패", `검사 실패: "${k.slice(0, 40)}"`));
    }
    const missing = [...new Map(targets.filter((x) => !Object.prototype.hasOwnProperty.call(tr, x.key)).map((x) => [x.key, x])).values()];
    if (missing.length) {
      warn("i18n-en.json", "번역 누락", `번역 누락 ${missing.length}건. 예약 작업이 다음 실행에서 채웁니다`);
      missing.slice(0, 10).forEach((x) => warn(x.file, "번역 누락", `번역 누락 (${x.file} ${x.field}): "${x.text.slice(0, 40)}"`));
    }
    const stale = Object.keys(tr).filter((k) => !keys.has(k));
    if (stale.length) warn("i18n-en.json", "낡은 번역", `지금 data 어디에도 쓰이지 않는 번역 ${stale.length}건. 예약 작업이 지웁니다`);
  }
}

if (warns.length <= 10) {
  warns.forEach((w) => console.warn("경고  " + w.text));
} else {
  // 같은 종류가 많으면 파일·종류별 개수와 앞의 5건만 보여 준다.
  const groups = new Map();
  for (const w of warns) { const k = w.where + " · " + w.kind; groups.set(k, (groups.get(k) || 0) + 1); }
  for (const [k, n] of groups) console.warn("경고  " + k + ": " + n + "건");
  warns.slice(0, 5).forEach((w) => console.warn("경고  " + w.text));
  console.warn("경고  … 외 " + (warns.length - 5) + "건");
}
errors.forEach((e) => console.error("오류  " + e));
const count = Object.values(sets).reduce((n, r) => n + r.length, 0);
const extra = hasPeople || hasTeams ? `, 인물 ${people.length}명, 팀 ${teams.length}개` : "";
console.log(`출처 ${Object.keys(sources).length}개, 행 ${count}개${extra} 점검: 오류 ${errors.length}, 경고 ${warns.length}`);
// 정보 빈 칸은 현황만 알린다(경고로 세지 않는다). 규칙은 gaps.mjs 와 같다.
if (hasPeople) {
  const gap = (key) => people.filter((p) => gapsOf(p).includes(key)).length;
  console.log(`정보 빈 칸: 생년월일 ${gap("birth")}, 포지션 ${gap("role")}, 국적 ${gap("nationality")}, 계약 ${gap("contract")}`);
}
process.exit(errors.length ? 1 : 0);
