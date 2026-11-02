// 단위 시험: 날짜 계산, ID, 주소 읽기, 인덱스, 팀 로스터. node:assert 만 쓴다.
// 실행: node scripts/test.mjs  (실패하면 종료 코드 1). 날짜는 모두 기준일을 인자로 고정해서, 실행하는 날과 무관하다.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { inlineScript, checkSitePath } from "./inline-script.mjs";
import { fileURLToPath } from "node:url";
import { ageOf, contractState, careerOf, slugOf, ID_RE, buildIndex, teamMoves, toItem, watchMeta, pillOf, pillText, cls, noteSegments, sharedTails, ownPart, routeOf, idsOf, matches, newestFirst } from "../js/model.js";
import { splitNote, newsRow } from "../js/views/common.js";
import { parseRoute } from "../js/state.js";
import { sortSchedule } from "../js/views/schedule.js";
import { withKst, stampOf, stampLabel, parseStamp, fmtDate, dayWord, dateWord, dateLong, clockText } from "../js/format.js";
import { tIn, setLang, setEnTable, trEn, trNote, trWhole } from "../js/i18n.js";
import { collectTargets } from "./i18n-targets.mjs";
import { KO } from "../js/i18n/ko.js";
import { EN } from "../js/i18n/en.js";
import { regionName, tierName } from "../js/model.js";
import { tabName } from "../js/views/common.js";
import { refuseReason, prepareOut, MARK } from "./out-dir.mjs";
import { termEn } from "../js/i18n/glossary.js";
import { toLang } from "./i18n-html.mjs";
import { routeHTML } from "../js/components/route.js";
import { rowHTML } from "../js/components/row.js";

const T = 46326; // 2026-10-31 (KST)
let n = 0;
function t(name, fn) { fn(); n++; console.log("ok", name); }

t("ageOf: 생일 전날·당일·다음날, 연도만, 형식 오류", () => {
  assert.deepEqual(ageOf("2001-11-01", T), { age: 24, approx: false }); // 내일이 생일
  assert.deepEqual(ageOf("2001-10-31", T), { age: 25, approx: false }); // 오늘이 생일
  assert.deepEqual(ageOf("2001-10-30", T), { age: 25, approx: false }); // 어제가 생일
  assert.deepEqual(ageOf("2001", T), { age: 25, approx: true });
  assert.equal(ageOf("", T), null);
  assert.equal(ageOf("2001-1-5", T), null);
});

t("contractState: 어제·오늘·내일·미공개", () => {
  assert.deepEqual(contractState(46325, T), { kind: "expired", label: "만료됨", days: -1 });
  assert.deepEqual(contractState(46326, T), { kind: "today", label: "오늘 만료", days: 0 });
  assert.deepEqual(contractState(46327, T), { kind: "active", label: "D-1", days: 1 });
  assert.equal(contractState(undefined, T).label, "미공개");
});

const career = (from, to) => careerOf({ career: [{ team: "x", from, to }] }, T)[0];
t("careerOf: 지난달·이번 달 시작은 진행 중, 다음 달 시작은 예정(R-04)", () => {
  assert.equal(career("2026-09", null).current, true);
  assert.equal(career("2026-10", null).current, true);
  assert.equal(career("2026-11", null).current, false);
  assert.equal(career("2026-11", null).upcoming, true);
  assert.equal(career("2024-01", "2026-10").current, false); // 끝난 칸
});
t("careerOf: 최신 시작 순서", () => {
  const rows = careerOf({ career: [{ team: "a", from: "2023-01", to: "2024-01" }, { team: "b", from: "2024-02", to: null }] }, T);
  assert.deepEqual(rows.map(r => r.team), ["b", "a"]);
});

t("slugOf: 악센트, 공백, 빈 이름, 한자", () => {
  assert.equal(slugOf("Leviatán"), "leviatan");
  assert.equal(slugOf("luk   xo"), "luk-xo");
  assert.equal(slugOf("Ñandú"), "nandu");
  assert.match(slugOf("王者"), /^x-[a-z0-9]+$/);
  assert.notEqual(slugOf("王者"), slugOf("王"));
});

t("ID_RE: 허용과 거부", () => {
  for (const ok of ["oxy", "x-1a2b", "a-b-9"]) assert.ok(ID_RE.test(ok), ok);
  for (const bad of ["OXY", "a b", "a/b", "", "é", "a_b", "../x"]) assert.ok(!ID_RE.test(bad), bad);
});

t("parseRoute: 목록·인물·팀·끝 슬래시 없음·잘못된 ID", () => {
  const B = "/VCT-board/";
  assert.deepEqual(parseRoute({ pathname: B, hash: "#players" }, B), { view: "list", tab: "players" });
  assert.deepEqual(parseRoute({ pathname: B + "p/oxy/", hash: "" }, B), { view: "person", id: "oxy" });
  assert.deepEqual(parseRoute({ pathname: B + "t/sentinels", hash: "" }, B), { view: "team", id: "sentinels" });
  assert.deepEqual(parseRoute({ pathname: B + "p/OXY/", hash: "" }, B), { view: "notfound" });
  assert.deepEqual(parseRoute({ pathname: B + "p/a%E0%A4%A/", hash: "" }, B), { view: "notfound" });
  assert.deepEqual(parseRoute({ pathname: B + "p/oxy/extra/", hash: "" }, B), { view: "notfound" });
});

const row = (over) => Object.assign({ region: "Americas", team: "Team", name: "Ann", status: "구직 중", date: 46320, conf: "C", note: "", src: "s" }, over);
const SRC = { s: ["a", "https://a.test"] };
t("buildIndex: 한 선수가 선수 탭과 이적 탭 양쪽 소식으로 묶임, toItem 기존 필드 불변", () => {
  const D = { sources: SRC, players: [row({ personId: "ann", teamId: "t1" })], coaches: [], transfers: { players: [row({ from: "Team", to: "Other", fromTeam: "t1", toTeam: "t2", type: "이적", personId: "ann" })], coaches: [] }, watch: [] };
  const I = buildIndex(D);
  assert.equal(I.byPerson.ann.length, 2);
  const base = toItem(D.players[0], "player", SRC);
  for (const k of Object.keys(base)) assert.deepEqual(I.byPerson.ann[0].item[k], base[k], k);
});
t("buildIndex: 이름이 빈 행은 인물 ID 를 만들지 않음(이전 검토 요청 1)", () => {
  const I = buildIndex({ sources: SRC, players: [row({ name: "" })], coaches: [], transfers: { players: [], coaches: [] }, watch: [] });
  assert.deepEqual(Object.keys(I.byPerson), []);
});
t("buildIndex: constructor·toString 이 ID 여도 깨지지 않음(R-03)", () => {
  const D = { sources: SRC, players: [row({ name: "constructor" }), row({ name: "toString" })], coaches: [], transfers: { players: [], coaches: [] }, watch: [], people: [{ id: "constructor", name: "constructor", career: [] }] };
  const I = buildIndex(D);
  assert.equal(I.people.constructor.name, "constructor");
  assert.ok(I.byPerson.constructor && I.byPerson.tostring);
  assert.equal(I.teams.constructor, undefined);
});
t("buildIndex: teamIds 가 문자열이어도 배열로 읽음(R-05)", () => {
  const D = { sources: SRC, players: [], coaches: [], transfers: { players: [], coaches: [] }, watch: [{ region: "Americas", team: "A / B", targets: "x", situation: "y", src: "s", teamIds: "fx-alpha" }] };
  assert.deepEqual(Object.keys(buildIndex(D).byTeam), ["fx-alpha"]);
});

t("teamMoves: 로스터는 진행 중인 칸만, 예정 칸은 제외(R-04)", () => {
  const IDX = buildIndex({ sources: SRC, players: [], coaches: [], transfers: { players: [], coaches: [] }, watch: [] });
  IDX.people = { now: { id: "now", name: "Now", kind: "player", career: [{ team: "t1", from: "2026-01", to: null }] }, soon: { id: "soon", name: "Soon", kind: "player", career: [{ team: "t1", from: "2026-11", to: null }] } };
  assert.deepEqual(teamMoves("t1", IDX, T).roster.map(p => p.id), ["now"]);
});

t("out-dir: 저장소 루트·상위·안쪽 폴더 거부, _site 만 예외(R-01, 판정만, 파일은 안 건드림)", () => {
  const R = "C:/Users/KDB/Coding/VCT-board";
  assert.equal(refuseReason(R, R), "저장소 루트");
  assert.equal(refuseReason(R + "/js", R), "저장소 안의 폴더");
  assert.equal(refuseReason(R + "/..", R), "저장소의 상위 폴더");
  assert.equal(refuseReason(R + "/_site", R, { allowSite: true }), null);
  assert.equal(refuseReason(R + "/_site", R), "저장소 안의 폴더");
});

t("teamMoves: 이름이 constructor·toString 인 인물도 들어온·나간 집계에 한 번씩 들어감(R-03, Set)", () => {
  const tr = (name, from, to) => ({ region: "Americas", name, from, to, type: "이적", date: 46320, conf: "C", src: "s", fromTeam: from, toTeam: to });
  const D = { sources: SRC, players: [], coaches: [], transfers: { players: [tr("constructor", "t1", "t2"), tr("toString", "t2", "t1"), tr("constructor", "t1", "t2")], coaches: [] }, watch: [] };
  const m = teamMoves("t2", buildIndex(D), T);
  assert.deepEqual(m.incoming.map(e => e.item.pid), ["constructor"]); // 같은 인물 두 번은 한 번만
  assert.deepEqual(m.outgoing.map(e => e.item.pid), ["tostring"]);
  assert.equal(teamMoves("t1", buildIndex(D), T).outgoing.length, 1);
});

const VALIDATE = fileURLToPath(new URL("./validate.mjs", import.meta.url));
const FIX = fileURLToPath(new URL("./fixtures", import.meta.url));
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), "vct-test-" + name + "-"));
t("validate: career 의 to 가 from 보다 앞서면 오류 종료 1(이전 검토 요청 3)", () => {
  const dir = tmp("career");
  for (const f of fs.readdirSync(FIX)) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const people = JSON.parse(fs.readFileSync(path.join(dir, "people.json"), "utf8"));
  people[0].career[0] = { team: "fx-alpha", from: "2026-10", to: "2025-01" };
  fs.writeFileSync(path.join(dir, "people.json"), JSON.stringify(people));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /career\.to "2025-01" 은\(는\) from 보다 앞설 수 없습니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});
t("validate: 정상 경력(시작과 끝이 같은 달 포함)은 통과", () => {
  const dir = tmp("ok");
  for (const f of fs.readdirSync(FIX)) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const people = JSON.parse(fs.readFileSync(path.join(dir, "people.json"), "utf8"));
  people[0].career[0] = { team: "fx-alpha", from: "2026-10", to: "2026-10" };
  fs.writeFileSync(path.join(dir, "people.json"), JSON.stringify(people));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("out-dir 실제 동작: 표시 파일 없는 폴더는 그대로 남고, 표시 파일 있는 폴더만 비워짐(임시 폴더에서만)", () => {
  const root = tmp("root"); // 저장소가 아닌 임시 폴더를 기준으로 삼는다
  const noMark = tmp("nomark"), withMark = tmp("withmark");
  fs.writeFileSync(path.join(noMark, "keep.txt"), "keep");
  assert.throws(() => prepareOut(noMark, root), /표시 파일이 없어/);
  assert.equal(fs.readFileSync(path.join(noMark, "keep.txt"), "utf8"), "keep");
  fs.writeFileSync(path.join(withMark, MARK), "x");
  fs.writeFileSync(path.join(withMark, "old.html"), "old");
  prepareOut(withMark, root);
  assert.ok(!fs.existsSync(path.join(withMark, "old.html")));
  assert.ok(fs.existsSync(path.join(withMark, MARK)));
  prepareOut(withMark, root); // 같은 폴더 재실행은 정상
  assert.ok(fs.existsSync(path.join(withMark, MARK)));
  for (const d of [root, noMark, withMark]) fs.rmSync(d, { recursive: true, force: true });
});

t("splitNote: 끝의 출처·시각(UTC→KST)과 교차 확인을 떼고 본문은 남김", () => {
  const r = splitNote("Sentinels 공식 X 방출 발표(VLR·Strafe 원문 확인). 2026.3 G2에서 합류, 8개월 만에 이탈. 교차 확인: VLR, Strafe, Liquipedia 이적 로그(10/30) (Sentinels X 10/31 00:15 UTC)");
  assert.equal(r.body, "Sentinels 공식 X 방출 발표(VLR·Strafe 원문 확인). 2026.3 G2에서 합류, 8개월 만에 이탈.");
  assert.deepEqual(r.src, { name: "Sentinels X", when: "10/31 오전 9:15" });
  assert.deepEqual(r.cross, ["VLR", "Strafe", "Liquipedia 이적 로그(10/30)"]);
});
t("splitNote: 날짜 넘김·연말·KST 그대로·문장 가운데 교차 확인", () => {
  assert.equal(splitNote("a (Sentinels X 10/30 20:31 UTC)").src.when, "10/31 오전 5:31");
  assert.equal(splitNote("a (X 12/31 20:00 UTC)").src.when, "1/1 오전 5:00");
  assert.equal(splitNote("a (GM X 10/25 18:35 KST)").src.when, "10/25 오후 6:35");
  const r = splitNote("LOUD 챔피언. 교차 확인: Sheep(10/28), TheSpike. 팀 공식 발표 전 (TheSpike 10/29 16:13 UTC)");
  assert.equal(r.body, "LOUD 챔피언. 팀 공식 발표 전");
  assert.deepEqual(r.cross, ["Sheep(10/28)", "TheSpike"]);
});
t("splitNote: 규칙에 안 맞는 글은 원문 그대로, 빈 값", () => {
  const raw = "Barça 2027 합류 보도(Sheep), 공식 발표 전 (갱신 10/31 23:58 UTC, 보도 시각 미확인)";
  assert.deepEqual(splitNote(raw), { body: raw, src: null, cross: null });
  assert.deepEqual(splitNote("Sheep 10/25 15:44 UTC / 결별"), { body: "Sheep 10/25 15:44 UTC / 결별", src: null, cross: null });
  assert.equal(splitNote("a (X 13/40 25:00 UTC)").src, null);
  assert.deepEqual(splitNote(undefined), { body: "", src: null, cross: null });
});

t("watchMeta: 종류 판정(앞선 규칙 우선), 없음", () => {
  const k = (s) => watchMeta(s).kind;
  assert.equal(k("FURIA는 10/30 공식 발표로 발로란트 믹스 철수(전 선수·코치 11/2 FA)"), "withdraw");
  assert.equal(k("팀 해체"), "withdraw");
  assert.equal(k("파트너십 탈락. NAVI는 10/28 로스터 전원 방출"), "dropped");
  assert.equal(k("계약 11/2 만료 (NRG는 파트너 유지) / eeiu 합류 구두 합의 보도"), "expiring");
  assert.equal(k("계약 만료 예정"), "expiring");
  assert.equal(k("kiNgg·Sato: G2 합류 의향 보도(9/16)"), "joining");
  assert.equal(k("2027-28 VCT Americas 파트너 팀 선정. 재계약 구두 합의 보도"), "");
  assert.equal(watchMeta("x").label, "");
});
t("watchMeta: [확정]·(확인 M/D) 를 읽고 본문에서 뗌", () => {
  assert.deepEqual(watchMeta("[확정] 발로란트 철수 발표 (확인 11/1)"), { kind: "withdraw", label: "철수·해체", confirmed: true, checked: "11/1", body: "발로란트 철수 발표" });
  assert.deepEqual(watchMeta("계약 만료 예정"), { kind: "expiring", label: "계약 만료", confirmed: false, checked: "", body: "계약 만료 예정" });
});

t("teamMoves: 방출된 인물은 로스터에서 빠짐(Sentinels/JonahP), 남은 인물은 유지", () => {
  const D = { sources: SRC, coaches: [], transfers: { players: [], coaches: [] }, watch: [],
    players: [row({ name: "JonahP", personId: "jonahp", team: "Sentinels", teamId: "sentinels", status: "방출(Sentinels 공식 발표)", date: 46326 })],
    teams: [{ id: "sentinels", name: "Sentinels", active: true }],
    people: [{ id: "jonahp", name: "JonahP", kind: "player", career: [{ team: "sentinels", from: "2026-03", to: null }] },
      { id: "zekken", name: "zekken", kind: "player", career: [{ team: "sentinels", from: "2023-01", to: null }] }] };
  const m = teamMoves("sentinels", buildIndex(D), T);
  assert.deepEqual(m.roster.map(p => p.id), ["zekken"]);
  assert.deepEqual(m.outgoing.map(e => e.item.pid), ["jonahp"]);
  assert.equal(m.closed, false);
});
t("teamMoves: 이 팀에서 나간 이적이 가장 최근이면 로스터에서 빠짐, 구직 중(계약 중)은 유지", () => {
  const D = { sources: SRC, coaches: [], watch: [], teams: [],
    players: [row({ name: "Stay", personId: "stay", teamId: "t1", status: "탐색 허가(계약 중)" })],
    transfers: { players: [row({ name: "Go", personId: "go", from: "T1", to: "T2", fromTeam: "t1", toTeam: "t2", type: "이적" })], coaches: [] },
    people: ["stay", "go"].map(id => ({ id, name: id, kind: "player", career: [{ team: "t1", from: "2025-01", to: null }] })) };
  assert.deepEqual(teamMoves("t1", buildIndex(D), T).roster.map(p => p.id), ["stay"]);
});
t("teamMoves: 운영 종료 팀(FURIA, active:false)은 로스터가 비고 closed", () => {
  const D = { sources: SRC, players: [], coaches: [], transfers: { players: [], coaches: [] }, watch: [],
    teams: [{ id: "furia", name: "FURIA", active: false }],
    people: [{ id: "mwzera", name: "mwzera", kind: "player", career: [{ team: "furia", from: "2025-01", to: null }] }] };
  const m = teamMoves("furia", buildIndex(D), T);
  assert.deepEqual(m.roster, []);
  assert.equal(m.closed, true);
});

t("teamMoves: 같은 날 이적 행과 \"계약 완료(새 팀)\" 행이 함께 있어도 이 팀 로스터에서 빠짐(FURIA/eeiu)", () => {
  const D = { sources: SRC, coaches: [], watch: [], teams: [{ id: "furia", name: "FURIA", active: true }],
    players: [row({ name: "eeiu", personId: "eeiu", team: "FURIA", teamId: "furia", status: "계약 완료(NRG) · 구두 합의 보도", date: 46325 })],
    transfers: { players: [row({ name: "eeiu", personId: "eeiu", from: "FURIA", to: "NRG", fromTeam: "furia", toTeam: "nrg", type: "이적", date: 46325 })], coaches: [] },
    people: [{ id: "eeiu", name: "eeiu", kind: "player", career: [{ team: "furia", from: "2025-12", to: null }] }] };
  assert.deepEqual(teamMoves("furia", buildIndex(D), T).roster, []);
});

// P1: 단일 출처나 구두 합의 글은 합류 보도(◇), 공식 확정 표현이나 발표일이 있을 때만 확정(✓).
const mv = (over) => toItem(Object.assign({ region: "EMEA", from: "A", to: "B", fromTeam: "a", toTeam: "b", name: "X", type: "이적", date: 46320, conf: "C", note: "", src: "s" }, over), "t", SRC);
t("pillOf: 단일 출처(R) 계약 완료는 합류 보도", () => {
  assert.deepEqual(pillOf({ status: "계약 완료(Sentinels)", conf: "R" }), ["signed", "Sentinels 합류", "reported", "합류 보도"]);
  assert.equal(pillText(pillOf({ status: "계약 완료(Sentinels)", conf: "R" })), "Sentinels 합류 보도"); // 화면 글
});
t("pillOf: 확정 표현 계약 완료(C)는 확정", () => {
  assert.deepEqual(pillOf({ status: "계약 완료(Mandatory)", conf: "C" }), ["signed", "Mandatory 합류", "confirmed", "합류 확정"]);
});
t("pillOf: 이적 행은 발표일이 숫자면 R 이어도 확정, 없고 R 이면 보도", () => {
  assert.deepEqual(pillOf(mv({ conf: "R", signedDate: 46320 })), ["signed", "B 합류", "confirmed", "합류 확정"]);
  assert.deepEqual(pillOf(mv({ conf: "R" })), ["signed", "B 합류", "reported", "합류 보도"]);
});
t("pillOf: \"X 합류 임박(보도)\" 은 팀 이름을 읽되 분류는 확인 필요 그대로", () => {
  assert.deepEqual(pillOf({ status: "BLG 합류 임박(보도)", conf: "R" }), ["unknown", "BLG 합류 보도"]);
});
t("cls: 보도·확정 모두 signed, 임박 글은 unknown 그대로(필터 불변)", () => {
  assert.equal(cls({ status: "계약 완료(Sentinels)", conf: "R" }), "signed");
  assert.equal(cls({ status: "계약 완료(Mandatory)", conf: "C" }), "signed");
  assert.equal(cls(mv({ conf: "R" })), "signed");
  assert.equal(cls({ status: "BLG 합류 임박(보도)", conf: "R" }), "unknown");
});

// P2 메모: 같은 팀의 같은 꼬리는 팀 머리에 한 번, 행에는 개인 부분만. 화면 나눔이고 데이터는 그대로다.
const memo = (team, note) => ({ team, note });
t("sharedTails: 같은 팀 세 행이 같은 꼬리면 공통 꼬리 하나, 개인 부분은 나머지", () => {
  const items = [memo("FURIA", "개인 A / 발로란트 철수 (출처 10/30)"), memo("FURIA", "개인 B / 발로란트 철수 (출처 10/30)"), memo("FURIA", "개인 C / 발로란트 철수 (출처 10/30)")];
  const S = sharedTails(items);
  assert.equal(S.size, 1);
  assert.equal(S.get("FURIA"), "발로란트 철수 (출처 10/30)");
  assert.deepEqual(items.map(it => ownPart(it.note, S.get(it.team))), ["개인 A", "개인 B", "개인 C"]);
});
t("sharedTails: 꼬리가 같아도 팀이 다르면 공통 아님", () => {
  const items = [memo("FURIA", "개인 / 꼬리"), memo("NRG", "개인 / 꼬리")];
  assert.equal(sharedTails(items).size, 0);
});
t("sharedTails: 한 행에만 있는 꼬리는 공통 아님, ownPart 는 메모 전체", () => {
  const items = [memo("EG", "개인 / 한 행의 꼬리"), memo("EG", "다른 메모")];
  const S = sharedTails(items);
  assert.equal(S.size, 0);
  assert.equal(ownPart(items[0].note, S.get("EG")), "개인 / 한 행의 꼬리");
});
t("sharedTails: 메모 전체가 같은 한 조각(EG 꼴)이면 개인 부분은 빈 문자열", () => {
  const items = [memo("EG", "EG는 11/2 운영 종료."), memo("EG", "EG는 11/2 운영 종료."), memo("EG", "EG는 11/2 운영 종료.")];
  assert.equal(ownPart(items[0].note, sharedTails(items).get("EG")), "");
});
t("noteSegments·sharedTails·ownPart: 빈 메모와 ' / ' 없는 메모에서 오류 없음", () => {
  assert.deepEqual(noteSegments(""), []);
  assert.deepEqual(noteSegments(undefined), []);
  assert.equal(sharedTails([memo("X", ""), memo("X", null), memo("X", undefined)]).size, 0);
  assert.equal(ownPart(undefined, undefined), "");
  assert.equal(ownPart("한 조각", "한 조각"), "");
});

// P2 일정: 시작일 순. 기준일 2026-11-01(46327)로 고정한다.
const S0 = 46327;
const sch = (date, title) => ({ date, title, source: "s" });
t("sortSchedule: 현재 일정과 같은 꼴 10행이 시작일 순(Pacific 1/11 이 4개 지역 1/14 보다 앞)", () => {
  const rows = [sch("2027-01-14 ~ 02-07", "4개 지역 Kickoff"), sch("2027-01-11 ~ 01-31", "VCT Pacific Kickoff"), sch(46328, "2026 시즌 종료"),
    sch("11/5 ~ 11/8", "Americas 오픈 예선"), sch("11/25 ~ 12/5", "유럽 예선"), sch(46329, "FA 본격 개시"), sch("12/1", "12월 행사"),
    sch("미정", "날짜 미정"), sch(46328, "Cloud9 발표"), sch("2026-12-20 ~ 12-22", "연말 행사")];
  assert.deepEqual(sortSchedule(rows, S0).map(r => r.title), ["2026 시즌 종료", "Cloud9 발표", "FA 본격 개시", "Americas 오픈 예선", "유럽 예선", "12월 행사", "연말 행사", "VCT Pacific Kickoff", "4개 지역 Kickoff", "날짜 미정"]);
});
t("sortSchedule: 연도 없는 11/2 와 2027 연도 있는 날짜가 섞여도 순서가 맞음", () => {
  const rows = [sch("2027-01-11 ~ 01-31", "b"), sch("11/2", "a")];
  assert.deepEqual(sortSchedule(rows, S0).map(r => r.title), ["a", "b"]);
});
t("sortSchedule: 날짜를 못 읽은 행은 맨 뒤, 같은 시작일은 끝일 순·원래 순서", () => {
  const rows = [sch("미정", "A"), sch(46330, "B"), sch("11/2 ~ 11/3", "C"), sch(46330, "D")];
  assert.deepEqual(sortSchedule(rows, S0).map(r => r.title), ["C", "B", "D", "A"]);
});

// P3: 머리말 갱신 시각에 시간대(KST)를 붙인다. 이미 있으면 그대로(멱등).
t("withKst: 머리말 시각에 KST 를 붙임", () => {
  assert.equal(withKst("2026-11-01 13:58 기준입니다."), "2026-11-01 13:58 KST 기준입니다.");
});
t("withKst: 이미 KST 가 있으면 그대로, 두 번 붙지 않음", () => {
  const once = withKst("2026-11-01 13:58 기준입니다.");
  assert.equal(withKst(once), once);
  assert.equal(withKst("2026-11-01 13:58 KST 기준입니다."), "2026-11-01 13:58 KST 기준입니다.");
});
t("withKst: 시각이 없는 글은 그대로", () => {
  const plain = "LFT와 FA는 둘 다 새 팀을 찾는 중이라는 뜻입니다.";
  assert.equal(withKst(plain), plain);
});

// 이동 경로(routeOf): 출발 팀 → 도착 팀. 팀 ID 는 teams 에 있을 때만 남는다.
const TEAMS = Object.fromEntries(["eintracht-frankfurt", "team-heretics", "sentinels", "team-liquid", "leviatan", "blg", "t2"].map(id => [id, { id }]));
const it0 = (over) => Object.assign({ team: "", tid: "", status: "", conf: "R", note: "" }, over);
t("routeOf: 계약 완료(X) · 구두 합의 보도 → 출발·도착·꾸밈말·단계", () => {
  const r = routeOf(it0({ team: "Eintracht Frankfurt", tid: "eintracht-frankfurt", status: "계약 완료(Team Heretics) · 구두 합의 보도" }), TEAMS);
  assert.deepEqual(r, { kind: "move", from: "Eintracht Frankfurt", fromId: "eintracht-frankfurt", to: "Team Heretics", toId: "team-heretics", stage: "reported", note: "구두 합의 보도" });
});
t("routeOf: 계약 완료(X) 확정 표현은 꾸밈말 없음", () => {
  const r = routeOf(it0({ team: "Y", status: "계약 완료(Fnatic)", conf: "C" }), TEAMS);
  assert.equal(r.to, "Fnatic");
  assert.equal(r.note, "");
});
t("routeOf: 'Y 이탈 · 계약 완료(X) 구두 합의 보도' → 도착 X, 이탈은 꾸밈말에서 뺌", () => {
  const r = routeOf(it0({ team: "LOUD", status: "LOUD 이탈 · 계약 완료(Leviatán) 구두 합의 보도" }), TEAMS);
  assert.equal(r.to, "Leviatán");
  assert.equal(r.note, "구두 합의 보도");
});
t("routeOf: 'Y 이탈(본인 확인) · X 합류 보도' → 도착 X", () => {
  assert.equal(routeOf(it0({ team: "LOUD", status: "LOUD 이탈(본인 확인) · Leviatán 합류 보도" }), TEAMS).to, "Leviatán");
});
t("routeOf: 'X 합류 임박(보도)' → 도착 X, 꾸밈말은 '임박(보도)'", () => {
  const r = routeOf(it0({ team: "M80", status: "BLG 합류 임박(보도)" }), TEAMS);
  assert.equal(r.to, "BLG");
  assert.equal(r.note, "임박(보도)");
});
t("routeOf: 계약 완료(X 잔류) → 잔류 kind, 팀은 X", () => {
  const r = routeOf(it0({ team: "Team Liquid", tid: "team-liquid", status: "계약 완료(Team Liquid 잔류)" }), TEAMS);
  assert.equal(r.kind, "stay");
  assert.equal(r.to, "Team Liquid");
});
t("routeOf: 이적 행은 tidTo 를 도착 ID 로 쓴다", () => {
  const r = routeOf(it0({ moved: true, team: "A", tid: "a", next: "Sentinels", tidTo: "sentinels", status: "이적" }), TEAMS);
  assert.deepEqual([r.kind, r.from, r.to, r.toId], ["move", "A", "Sentinels", "sentinels"]);
});
t("routeOf: teams 에 없는 도착 팀은 ID 가 빈 값(링크 없음)", () => {
  assert.equal(routeOf(it0({ team: "Y", status: "계약 완료(Foo)" }), TEAMS).toId, "");
});
t("routeOf: 탐색·방출·팀 이탈·FA 는 이동이 아님(null)", () => {
  for (const status of ["탐색 허가(계약 중)", "방출(Sentinels 공식 발표)", "팀 이탈 · 제한적 FA", "FA(11/2) · FURIA 철수 확정"]) {
    assert.equal(routeOf(it0({ team: "X", status }), TEAMS), null, status);
  }
});
t("routeOf: 팀이 '-' 이면 출발 팀은 빈 값", () => {
  assert.equal(routeOf(it0({ team: "-", status: "계약 완료(Fnatic)" }), TEAMS).from, "");
});
t("routeOf: stage 는 pillOf(it)[2] 와 같다", () => {
  const R = it0({ team: "X", status: "계약 완료(Sentinels)", conf: "R" }), C = it0({ team: "X", status: "계약 완료(Mandatory)", conf: "C" });
  assert.equal(routeOf(R, TEAMS).stage, pillOf(R)[2]);
  assert.equal(routeOf(R, TEAMS).stage, "reported");
  assert.equal(routeOf(C, TEAMS).stage, "confirmed");
});

t("teamMoves: 다른 팀 소속 선수 행 '계약 완료(t2)' 가 t2 의 들어온 인물, t1 의 나간 인물", () => {
  const D = { sources: SRC, coaches: [], transfers: { players: [], coaches: [] }, watch: [],
    teams: [{ id: "t1", name: "T1", active: true }, { id: "t2", name: "T2", active: true }],
    players: [row({ name: "Mover", personId: "mover", team: "T1", teamId: "t1", status: "계약 완료(T2)", conf: "R", date: 46320 })],
    people: [{ id: "mover", name: "Mover", kind: "player", career: [{ team: "t1", from: "2025-01", to: null }] }] };
  assert.deepEqual(teamMoves("t2", buildIndex(D), T).incoming.map(e => e.item.pid), ["mover"]);
  assert.deepEqual(teamMoves("t1", buildIndex(D), T).outgoing.map(e => e.item.pid), ["mover"]);
});

// ── 9회차 F-06: 핵심 규칙을 지금 동작대로 고정한다. 날짜는 절대 일련번호로 적는다.
const serialOf = (y, m, d) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5;

t("serialOf: 기준일 T 는 2026-10-31", () => {
  assert.equal(serialOf(2026, 10, 31), T);
});

t("parseStamp: 범위 안의 값은 읽고, 범위 밖이면 null", () => {
  assert.deepEqual(parseStamp("10/24 16:30 UTC"), { mon: 10, day: 24, hh: 16, mm: 30, tz: "UTC", min: 16 * 60 + 30 + 540 });
  assert.deepEqual(parseStamp("10/24 16:30 KST"), { mon: 10, day: 24, hh: 16, mm: 30, tz: "KST", min: 16 * 60 + 30 });
  assert.equal(parseStamp("13/1 10:00 UTC"), null);
  assert.equal(parseStamp("10/24 24:00 UTC"), null);
  assert.equal(parseStamp("10/24 10:60 KST"), null);
  assert.equal(parseStamp("시각 없음"), null);
});

t("stampOf: 날짜 칸과 같은 날이면 한국 시간 분을 낸다", () => {
  // 10/24 16:30 UTC 는 10/25 01:30 KST 다.
  const it = { date: serialOf(2026, 10, 25), note: "LFT 게시 (Sheep 10/24 16:30 UTC)" };
  assert.equal(stampOf(it), serialOf(2026, 10, 24) * 1440 + 1530);
  assert.equal(stampLabel(it), "오전 1:30");
});

t("stampOf: 날짜 칸이 전날이면 null (UTC 가 KST 로 넘어가는 경우 포함)", () => {
  assert.equal(stampOf({ date: serialOf(2026, 10, 24), note: "(Sheep 10/24 16:30 UTC)" }), null);
  assert.notEqual(stampOf({ date: serialOf(2026, 10, 25), note: "발표 10/25 16:30 KST" }), null);
});

t("stampOf: 연말·연초 경계 (12/31 ↔ 1/1)", () => {
  // 12/31 23:30 UTC 는 1/1 08:30 KST 라 날짜 칸 1/1 과 맞는다.
  assert.equal(stampOf({ date: serialOf(2027, 1, 1), note: "x (A 12/31 23:30 UTC)" }), serialOf(2026, 12, 31) * 1440 + 23 * 60 + 30 + 540);
  // 12/31 23:30 KST 는 날짜 칸 1/1 과 다른 날이다.
  assert.equal(stampOf({ date: serialOf(2027, 1, 1), note: "x (A 12/31 23:30 KST)" }), null);
  // 1/1 00:10 KST 는 날짜 칸 12/31 과 다른 날이다.
  assert.equal(stampOf({ date: serialOf(2026, 12, 31), note: "x (A 1/1 00:10 KST)" }), null);
});

t("splitNote: 출처 이름·시각 분리, 교차 확인 분리, 범위 밖 시각은 원문 그대로", () => {
  const a = splitNote("LFT 게시. 교차 확인: VLR, Rib. (Sheep 10/24 16:30 UTC)");
  assert.deepEqual(a.src, { name: "Sheep", when: "10/25 오전 1:30" });
  assert.deepEqual(a.cross, ["VLR", "Rib"]);
  assert.equal(a.body, "LFT 게시.");
  const b = splitNote("메모 (A 13/1 10:00 UTC)");
  assert.equal(b.src, null);
  assert.equal(b.body, "메모 (A 13/1 10:00 UTC)");
  assert.equal(splitNote("").body, "");
});

t("newestFirst: 최신 날짜 먼저, 같은 날은 시각 있는 것, 그다음 늦은 시각", () => {
  const e = (date, note, id) => ({ kind: "player", item: { date, note, id } });
  const day = serialOf(2026, 10, 25);
  const ids = [e(serialOf(2026, 10, 24), "", "older"), e(day, "", "plain"), e(day, "(A 10/24 16:30 UTC)", "stamped"), e(day, "(A 10/24 20:00 UTC)", "later")]
    .sort(newestFirst).map((x) => x.item.id);
  assert.deepEqual(ids, ["later", "stamped", "plain", "older"]);
});

t("newestFirst: 같은 날 같은 시각은 원래 순서를 지킨다(동률)", () => {
  const e = (note, id) => ({ kind: "t", item: { date: serialOf(2026, 10, 25), note, id } });
  assert.deepEqual([e("(A 10/24 16:30 UTC)", "first"), e("(B 10/24 16:30 UTC)", "second")].sort(newestFirst).map((x) => x.item.id), ["first", "second"]);
});

t("idsOf: ZYZZ 와 zyzz 는 같은 ID 가 된다(의도된 현재 동작, F-05 경고로 감시)", () => {
  assert.equal(idsOf({ name: "ZYZZ" }, "player").pid, "zyzz");
  assert.equal(idsOf({ name: "zyzz" }, "player").pid, "zyzz");
});

t("idsOf: 이름이나 팀이 \"-\" 면 빈 ID (F-02)", () => {
  assert.deepEqual(idsOf({ name: "-", team: "-" }, "player"), { pid: "", tid: "" });
  assert.deepEqual(idsOf({ from: "-", to: "-", name: "-" }, "t"), { pid: "", tidFrom: "", tidTo: "", tid: "" });
});

t("idsOf: personId·teamId 가 있으면 이름보다 우선한다", () => {
  assert.equal(idsOf({ personId: "abc", name: "Other" }, "player").pid, "abc");
  assert.equal(idsOf({ teamId: "t1", team: "Other" }, "player").tid, "t1");
});

t("idsOf: 지켜볼 팀은 \" / \" 로 나누고 빈 칸을 거른다. teamIds 가 문자열이면 그대로 한 칸(R-05)", () => {
  assert.deepEqual(idsOf({ team: "FURIA / - / M80" }, "watch").tids, ["furia", "m80"]);
  assert.deepEqual(idsOf({ teamIds: "raw-id" }, "watch").tids, ["raw-id"]);
});

t("matches: 검색은 대소문자를 무시하고 팀 이름으로도 찾는다. 악센트는 무시하지 않는다(현재 동작)", () => {
  const tab = { status: true }, all = { region: "all", status: "all", q: "" };
  const it = { name: "TenZ", team: "Sentinels", region: "Americas", status: "구직 중" };
  assert.equal(matches(it, tab, { ...all, q: "tenz" }), true);
  assert.equal(matches(it, tab, { ...all, q: "sentinels" }), true);
  assert.equal(matches({ name: "Jóhn", region: "EMEA", status: "구직 중" }, tab, { ...all, q: "john" }), false);
});

t("matches: 지역과 상태 필터", () => {
  const it = { name: "A", team: "T", region: "Americas", status: "구직 중" }, tab = { status: true };
  assert.equal(matches(it, tab, { region: "EMEA", status: "all", q: "" }), false);
  assert.equal(matches(it, tab, { region: "Americas", status: "open", q: "" }), true);
  assert.equal(matches(it, tab, { region: "Americas", status: "signed", q: "" }), false);
});

t("fmtDate: 일련번호는 M/D, 글자는 그대로", () => {
  assert.equal(fmtDate(serialOf(2026, 10, 25)), "10/25");
  assert.equal(fmtDate("TBD"), "TBD");
});

t("newsRow (F-01): 같은 보도 시각이 날짜 줄과 출처 줄에 두 번 나오지 않는다", () => {
  const count = (html) => html.split("오전 1:30").length - 1;
  const withSrc = newsRow({ kind: "player", item: { name: "A", team: "Sentinels", date: serialOf(2026, 10, 25), note: "LFT 게시 (Sheep 10/24 16:30 UTC)", status: "LFT 게시", src: ["Sheep", null], conf: "R" } }, false);
  assert.equal(count(withSrc), 1);
  assert.match(withSrc, /Sheep <time>10\/25 오전 1:30<\/time>/);
  const noSrc = newsRow({ kind: "player", item: { name: "A", team: "Sentinels", date: serialOf(2026, 10, 25), note: "발표 10/24 16:30 UTC", status: "LFT 게시", src: null, conf: "R" } }, false);
  assert.equal(count(noSrc), 1);
});

// ── 10회차: 문구 사전과 언어별 표기. 언어를 바꾼 시험은 finally 에서 ko 로 되돌린다.
const params = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

t("사전: ko 와 en 의 키 집합이 같고, 영문에 한글이 없고, 매개변수 이름이 두 언어에서 같다", () => {
  assert.deepEqual(Object.keys(EN).sort(), Object.keys(KO).sort());
  for (const k of Object.keys(KO)) {
    assert.notEqual(EN[k], "", "빈 영문 값: " + k);
    assert.equal(params(EN[k]), params(KO[k]), "매개변수 불일치: " + k);
  }
  const hangulInEn = Object.keys(EN).filter((k) => /[가-힣]/.test(EN[k]));
  assert.deepEqual(hangulInEn, [], "영문 사전에 한글이 있다");
});

t("tIn: 키가 없으면 키 자체, 언어 사전에 없으면 ko 값, {이름} 은 그대로 끼운다", () => {
  assert.equal(tIn("en", "no.such.key"), "no.such.key");
  assert.equal(tIn("xx", "tab.players"), "선수");
  assert.equal(tIn("ko", "pill.joined", { team: "Sentinels" }), "Sentinels 합류");
  assert.equal(tIn("en", "pill.joined", { team: "Sentinels" }), "Joined Sentinels");
});

t("ko 출력 고정: 인원·나이·D-day·상대 날짜·날짜·시각 (지금 그대로)", () => {
  assert.equal(tIn("ko", "count.people", { n: 3 }), "3명");
  assert.equal(tIn("ko", "age.approx", { n: 24 }), "약 24세");
  assert.equal(tIn("ko", "age.exact", { n: 24 }), "24세");
  assert.equal(tIn("ko", "contract.dday", { n: 3 }), "D-3");
  assert.equal(tIn("ko", "date.ago", { n: 2 }), "2일 전");
  assert.equal(fmtDate(serialOf(2026, 10, 25), "ko"), "10/25");
  assert.equal(clockText(0, 5, "ko"), "오전 12:05");
  assert.equal(clockText(12, 5, "ko"), "오후 12:05");
});

t("en 표기: 날짜 Oct 25, 시각 1:30 AM, 0시·12시 경계", () => {
  assert.equal(fmtDate(serialOf(2026, 10, 25), "en"), "Oct 25");
  assert.equal(dateWord(new Date(Date.UTC(2026, 9, 24)), "en"), "Oct 24");
  assert.equal(clockText(1, 30, "en"), "1:30 AM");
  assert.equal(clockText(0, 5, "en"), "12:05 AM");
  assert.equal(clockText(12, 5, "en"), "12:05 PM");
  assert.equal(clockText(23, 59, "en"), "11:59 PM");
});

t("표기: 보도 시각은 UTC→KST 로 날짜가 넘어가도 두 언어에서 같은 시각을 가리킨다", () => {
  // 10/24 16:30 UTC = 10/25 01:30 KST. 날짜 칸 10/25 와 맞는다.
  const it = { date: serialOf(2026, 10, 25), note: "x 10/24 16:30 UTC" };
  assert.equal(stampLabel(it, "ko"), "오전 1:30");
  assert.equal(stampLabel(it, "en"), "1:30 AM");
});

t("dayWord: 오늘·어제·N일 전을 두 언어로", () => {
  const today = Math.floor((Date.now() + 9 * 36e5) / 864e5) + 25569;
  assert.equal(dayWord(today, "ko"), "오늘");
  assert.equal(dayWord(today, "en"), "Today");
  assert.equal(dayWord(today - 1, "ko"), "어제");
  assert.equal(dayWord(today - 1, "en"), "Yesterday");
  assert.equal(dayWord(today - 3, "ko"), "3일 전");
  assert.equal(dayWord(today - 3, "en"), "3 days ago");
});

t("en 화면 문구: 탭·지역·등급·알약·계약·지켜볼 팀·소식 줄에 한글이 없다", () => {
  setLang("en");
  try {
    const out = [];
    out.push(...["players", "coaches", "transfers", "watch"].map(tabName));
    out.push(...["Americas", "EMEA", "Pacific", "China"].map(regionName), tierName("partner"), tierName("academy"));
    for (const it of [{ status: "구직 중" }, { status: "팀 이탈 · 제한적 FA" }, { status: "방출" }, { status: "이탈" }, { status: "확인" }, { status: "BLG 합류 임박(보도)" }, { status: "계약 완료(T2)", team: "T1", conf: "R" }, { status: "계약 완료(T2)", team: "T1", conf: "R", signedDate: 46330 }]) {
      out.push(pillText(pillOf(it)));
    }
    out.push(contractState(46330, 46326).label, contractState(undefined).label, contractState(46326, 46326).label);
    out.push(watchMeta("철수 발표").label, watchMeta("[확정] 파트너십 탈락 (확인 10/30)").label, watchMeta("계약 만료 예정").label);
    out.push(newsRow({ kind: "player", item: { name: "Ann", team: "Sentinels", pid: "ann", date: 46326 - 1, note: "LFT posted (Sheep 10/24 16:30 UTC)", status: "LFT 게시", src: ["Sheep", null], conf: "R", tid: "sentinels", region: "Americas", sub: "Canada" } }, false));
    const bad = out.join("\n").match(/[가-힣][^<"]{0,20}/g) || [];
    assert.deepEqual(bad, [], "영문 화면에 한글이 남았다");
  } finally {
    setLang("ko");
  }
});

t("용어집: 현재 data 의 상태 문구가 전부 옮겨지고 영문에 한글이 없다", () => {
  const read = (f) => JSON.parse(fs.readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
  const statuses = [...new Set([...read("players.json"), ...read("coaches.json")].map((r) => r.status))];
  const miss = statuses.filter((s) => { const e = termEn(s); return e === null || /[가-힣]/.test(e); });
  assert.deepEqual(miss, [], "옮겨지지 않은 상태 문구");
});

t("용어집: 정해진 짝, 괄호·날짜·조각 나눔, 못 옮기면 null(반쪽 번역 없음)", () => {
  assert.equal(termEn("계약 완료(Sentinels)"), "Signed with Sentinels");
  assert.equal(termEn("방출(로스터 전원)"), "Released (entire roster)");
  assert.equal(termEn("FA(11/2) · 협상 가능"), "Free agent from Nov 2 · Open to talks");
  assert.equal(termEn("팀 이탈(본인 발표 · 계약 11/2 만료)"), "Left team (self-announced · contract ends Nov 2)");
  assert.equal(termEn("계약 완료(Team Liquid 잔류)"), "Re-signed with Team Liquid");
  assert.equal(termEn("Controller(보조)/Sentinel"), "Controller (secondary)/Sentinel");
  assert.equal(termEn("Duelist"), "Duelist");
  assert.equal(termEn("(은퇴 · 전 Sentinels)"), null);
  assert.equal(termEn("팀명 미정"), null);
});

t("주소: 영문 주소(en/ 기준)도 인물·팀·목록·없는 주소로 읽는다", () => {
  const base = "/VCT-board/en/";
  assert.deepEqual(parseRoute({ pathname: "/VCT-board/en/p/oxy/", hash: "" }, base), { view: "person", id: "oxy" });
  assert.deepEqual(parseRoute({ pathname: "/VCT-board/en/t/cloud9", hash: "" }, base), { view: "team", id: "cloud9" });
  assert.deepEqual(parseRoute({ pathname: "/VCT-board/en/", hash: "#coaches" }, base), { view: "list", tab: "coaches" });
  assert.deepEqual(parseRoute({ pathname: "/VCT-board/en/p/BAD/", hash: "" }, base), { view: "notfound" });
});

t("정적 문구: index.html 의 data-i18n 글자·HTML·속성이 한국어 사전 값과 같다", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const m of html.matchAll(/<(\w+)[^>]*? data-i18n="([^"]+)"[^>]*>([^<]*)<\/\1>/g)) assert.equal(m[3], KO[m[2]], m[2]);
  for (const m of html.matchAll(/<(\w+)[^>]*? data-i18n-html="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)) assert.equal(m[3], KO[m[2]], m[2]);
  for (const m of html.matchAll(/<\w+[^>]*? data-i18n-attr="([^"]+)"[^>]*>/g)) {
    for (const pair of m[1].split(";")) {
      const i = pair.indexOf(":"), name = pair.slice(0, i), key = pair.slice(i + 1);
      const v = new RegExp("\\s" + name + '="([^"]*)"').exec(m[0]);
      assert.equal(v && v[1], KO[key], key);
    }
  }
});

t("예약 작업 약속: 머리말 <p class=\"lede\"> 는 한 번, 기준 시각 형식과 main.js 스크립트 줄이 그대로", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html.match(/<p class="lede">/g).length, 1);
  assert.match(html, /<p class="lede">[^]*?\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} 기준입니다\.<\/p>/);
  assert.ok(html.includes('<script type="module" src="js/main.js"></script>'));
});

t("영문 틀: 한글이 없고 lang·머리말 시각·KR 안내 줄이 영문, 한국어 틀은 그대로", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const en = toLang(html, "en");
  assert.equal(/[가-힣]/.test(en), false, "영문 틀에 한글이 남았다");
  assert.ok(en.includes('<html lang="en">'));
  assert.match(en, /Updated \d{4}-\d{2}-\d{2} \d{1,2}:\d{2} KST\./);
  assert.ok(en.includes('<li class="kr-note">Items marked KR are shown in the original Korean.</li>'));
  assert.equal(toLang(html, "ko"), html);
});

t("경로 줄: 한국어 출력은 예전과 같고, 영문은 낭독 글 'from A to B' 순서로 읽힌다", () => {
  const r = { kind: "move", from: "A", fromId: "", to: "B", toId: "", stage: "confirmed" };
  assert.equal(routeHTML(r), '<span class="route"><span class="r-from">A</span><span class="r-next"><span class="sr">에서</span><span class="r-arrow" aria-hidden="true">→</span> <span class="r-to">B</span><span class="sr">로</span></span></span>');
  setLang("en");
  try {
    const en = routeHTML(r);
    assert.ok(en.includes('<span class="sr">from </span><span class="r-from">A</span>'));
    assert.ok(en.includes('<span class="sr">to </span><span class="r-to">B</span>'));
  } finally {
    setLang("ko");
  }
});

t("영문 행: 한글은 lang=ko 안에만 있다(비고·상태·팀 칸)", () => {
  setLang("en");
  try {
    const tab = { mode: "entry", teamObj: {}, shared: new Map() };
    const rows = [
      { region: "Americas", team: "(은퇴 · 전 Sentinels)", name: "TenZ", sub: "-", status: "LFT 게시", date: T - 1, conf: "C", note: "2024 은퇴, 현재 T1 콘텐츠 크리에이터. 복귀 확정 아님", src: ["Inven Global", "https://example.com"], pid: "tenz", tid: "" },
      { region: "Americas", team: "Cloud9", name: "OXY", sub: "Duelist, United States", status: "계약 완료(Sentinels)", date: T - 1, conf: "R", note: "C9 3년 만에 이탈, SEN 합류 보도.", src: ["Sheep Esports", null], pid: "oxy", tid: "cloud9" },
      { region: "Americas", team: "FURIA", name: "eeiu", sub: "-", status: "팀 이탈(PRX 공식 발표) · 새 팀 미발표", date: T - 1, conf: "R", note: "", src: null, pid: "eeiu", tid: "furia" }
    ];
    for (const it of rows) {
      const html = rowHTML(it, tab, {});
      const outside = html.replace(/<span lang="ko"[^>]*>[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");
      assert.equal(/[가-힣]/.test(outside), false, "lang=ko 밖의 한글: " + outside);
    }
  } finally {
    setLang("ko");
  }
});

t("번역 검사(trEn): 통과, 한글 남음, 보도 시각 바뀜, 교차 확인 바뀜, 숫자 빠짐, 표에 없음", () => {
  const src = "C9 3년 만에 이탈, SEN 합류 보도. 계약은 C9 2028까지. 공식 발표 전 (Sheep 10/24 16:30 UTC)";
  const ok = "Left C9 after 3 years; reported to join SEN. Contract with C9 runs through 2028. Not yet official. (Sheep 10/24 16:30 UTC)";
  const cross = "KRÜ 공식 X 결별 발표. 교차 확인: VLR 이적 로그, Sheep (KRU X 10/28 16:45 UTC)";
  const crossOk = "KRÜ official X departure announcement. 교차 확인: VLR 이적 로그, Sheep (KRU X 10/28 16:45 UTC)";
  setEnTable({ [src]: ok, "교차 확인 목록": "x", [cross]: crossOk, "X 합류 보도": "Joined X 합류" });
  assert.equal(trEn(src), ok, "통과하는 번역");
  assert.equal(trEn(cross), crossOk, "교차 확인 구절은 한글이어도 몸말 검사에서 뺀다");
  assert.equal(trEn("X 합류 보도"), null, "몸말에 한글이 남으면 null");
  setEnTable({ [src]: ok.replace("16:30", "17:30") });
  assert.equal(trEn(src), null, "보도 시각이 바뀌면 null");
  setEnTable({ [cross]: crossOk.replace("VLR 이적 로그, Sheep", "VLR, Sheep") });
  assert.equal(trEn(cross), null, "교차 확인 목록이 바뀌면 null");
  setEnTable({ [src]: ok.replace("2028", "2029") });
  assert.equal(trEn(src), null, "숫자 묶음이 빠지면 null");
  setEnTable({});
  assert.equal(trEn(src), null, "표에 없으면 null");
});

t("번역 표: 한국어 화면은 표를 쓰지 않는다, 영문 화면은 비고를 조각마다 바꾼다", () => {
  const seg = "C9 비파트너 탈락 후 허가";
  setEnTable({ [seg]: "Free to explore after C9 non-partner elimination." });
  try {
    setLang("ko");
    assert.equal(trNote(seg), seg);
    assert.equal(trWhole(seg), seg);
    setLang("en");
    assert.equal(trNote(seg + " / " + seg), "Free to explore after C9 non-partner elimination. / Free to explore after C9 non-partner elimination.");
    assert.equal(trNote("번역 없음 / " + seg), "번역 없음 / Free to explore after C9 non-partner elimination.");
  } finally {
    setLang("ko");
    setEnTable({});
  }
});

t("번역 표 파일: 모든 항목이 검사를 통과하고, 지금 data 에 쓰이는 키만 있다", () => {
  const read = (f) => JSON.parse(fs.readFileSync(new URL("../data/" + f + ".json", import.meta.url), "utf8"));
  const table = read("i18n-en");
  const D = { players: read("players"), coaches: read("coaches"), transfers: read("transfers"), watch: read("watch"), schedule: read("schedule"), sources: read("sources") };
  setEnTable(table);
  try {
    const failed = Object.keys(table).filter((k) => trEn(k) === null);
    assert.deepEqual(failed, [], "검사에 걸린 번역");
    const used = new Set(collectTargets(D).map((x) => x.key));
    assert.deepEqual(Object.keys(table).filter((k) => !used.has(k)), [], "쓰이지 않는 낡은 번역");
    for (const [k, v] of Object.entries(table)) assert.ok(!/[가-힣]/.test(v.replace(/교차 확인:[^.]*\.?/g, "").replace(/\([^)]*(UTC|KST)\)\s*$/, "")), "영문 몸말에 한글: " + k);
  } finally {
    setEnTable({});
  }
});

t("영문 행: 번역된 비고는 한글 없이 나온다(lang=ko 밖의 한글 0)", () => {
  const key = "C9 3년 만에 이탈, SEN 합류 보도. 계약은 C9 2028까지. 공식 발표 전 (Sheep 10/24 16:30 UTC)";
  setEnTable(JSON.parse(fs.readFileSync(new URL("../data/i18n-en.json", import.meta.url), "utf8")));
  setLang("en");
  try {
    const html = rowHTML({ region: "Americas", team: "Cloud9", name: "OXY", sub: "Duelist", status: "계약 완료(Sentinels)", date: T - 1, conf: "R", note: key, src: ["Sheep Esports", null], pid: "oxy", tid: "cloud9" }, { mode: "entry", teamObj: {}, shared: new Map() }, {});
    assert.ok(html.includes("Left C9 after 3 years"), "번역 문장이 나와야 한다");
    const outside = html.replace(/<span lang="ko"[^>]*>[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");
    assert.equal(/[가-힣]/.test(outside), false, "lang=ko 밖의 한글: " + outside);
  } finally {
    setLang("ko");
    setEnTable({});
  }
});

t("영문 안내: 약관·개인정보 영문 요약은 한글이 lang=ko 안에만 있고 한국어 원문으로 가는 링크가 있다", () => {
  for (const [doc, orig] of [["terms", "../../terms/"], ["privacy", "../../privacy/"]]) {
    const html = fs.readFileSync(new URL("../en/" + doc + "/index.html", import.meta.url), "utf8");
    assert.ok(html.includes('<html lang="en">'), doc + " lang");
    assert.ok(html.includes('href="' + orig + '"'), doc + " 원문 링크");
    assert.ok(html.includes("This is a summary. The Korean original prevails."), doc + " 요약 문장");
    const outside = html.replace(/<span lang="ko">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, "");
    assert.equal(/[가-힣]/.test(outside), false, doc + " lang=ko 밖의 한글");
  }
  const ko = KO, en = EN;
  assert.equal(en["foot.5"].includes("(Korean)"), false, "영문 푸터에 (Korean) 표시가 남았다");
  assert.ok(en["foot.5"].includes('href="en/privacy/"') && en["foot.5"].includes('href="en/terms/"'), "영문 푸터 링크는 영문 요약으로");
  assert.ok(ko["foot.5"].includes('href="privacy/"'), "한국어 푸터는 원문 그대로");
});

t("이적 빈 도착 팀: validate 오류, 잔류의 빈 도착은 통과, pillOf 는 '새 팀 합류'(앞 공백 없음)", () => {
  const dir = tmp("blankto");
  for (const f of fs.readdirSync(FIX)) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "transfers.json");
  const tr = JSON.parse(fs.readFileSync(file, "utf8"));
  tr.players[0].to = "";
  fs.writeFileSync(file, JSON.stringify(tr));
  const bad = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /transfers\.players\[0\] .*새 팀\(to\)이 비어 있습니다/);
  tr.players[0].type = "잔류(재계약)";
  fs.writeFileSync(file, JSON.stringify(tr));
  const stay = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(stay.status, 0, stay.stderr);
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(pillOf({ moved: true, status: "이적", next: "", team: "X", conf: "C", date: T }).slice(1, 2)[0], "새 팀 합류");
});

t("parseStamp: 없는 날짜(2/30, 4/31)는 null, 2/29·12/31 은 통과, 13/1 은 null", () => {
  assert.equal(parseStamp("2/30 12:00 UTC"), null);
  assert.equal(parseStamp("4/31 12:00 KST"), null);
  assert.notEqual(parseStamp("2/29 12:00 UTC"), null);
  assert.notEqual(parseStamp("12/31 23:59 KST"), null);
  assert.equal(parseStamp("13/1 12:00 UTC"), null);
});

t("validate: 비고의 없는 날짜(2/30)는 '없는 날짜' 경고", () => {
  const dir = tmp("baddate");
  for (const f of fs.readdirSync(FIX)) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "players.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  rows[0].note = "테스트 (Sheep 2/30 12:00 UTC)";
  fs.writeFileSync(file, JSON.stringify(rows));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.match(r.stderr, /보도 시각 2\/30 는 없는 날짜입니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("언어 이동 스크립트(index.html 인라인): 저장값·주소별 이동, ?stay·영문 주소 그대로, 저장소 예외는 아무것도 안 함", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const code = inlineScript(html);
  const run = (stored, pathname, search = "", hash = "") => {
    const calls = [];
    const storage = { getItem: () => { if (stored === "THROW") throw new Error("denied"); return stored; } };
    vm.runInNewContext(code, { location: { pathname, search, hash, replace: (u) => calls.push(u) }, localStorage: storage });
    return calls;
  };
  assert.deepEqual(run(null, "/VCT-board/"), []);
  assert.deepEqual(run("en", "/VCT-board/", "", "#coaches"), ["/VCT-board/en/#coaches"]);
  assert.deepEqual(run("en", "/VCT-board/p/oxy/"), ["/VCT-board/en/p/oxy/"]);
  assert.deepEqual(run("ko", "/VCT-board/en/t/cloud9/"), ["/VCT-board/t/cloud9/"]);
  assert.deepEqual(run("en", "/VCT-board/", "?stay"), []);
  assert.deepEqual(run("en", "/VCT-board/en/"), []);
  assert.deepEqual(run("THROW", "/VCT-board/p/oxy/"), []);
});

t("사이트 경로: build.mjs·dev-server.mjs·index.html 인라인 스크립트가 같은 경로를 쓴다", () => {
  const read = (f) => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");
  const site = /const SITE_PATH = "([^"]+)"/.exec(read("scripts/build.mjs"))[1];
  const prefix = /const PREFIX = "([^"]+)"/.exec(read("scripts/dev-server.mjs"))[1];
  assert.equal(prefix, site);
  checkSitePath(read("index.html"), site);
});

t("사이트 경로 검사: 스크립트 안 경로를 바꾸고 다른 곳에 같은 글자를 두면 실패한다", () => {
  const ok = '<html><head><script>var B="/VCT-board/";</script></head><body></body></html>';
  checkSitePath(ok, "/VCT-board/");
  const moved = '<html><head><script>var B="/other/";</script></head><body>"/VCT-board/"</body></html>';
  assert.throws(() => checkSitePath(moved, "/VCT-board/"), /사이트 경로 \/VCT-board\/ 가 없습니다/);
  assert.throws(() => inlineScript("<html><body></body></html>"), /인라인 스크립트가 없습니다/);
});

t("dateLong: 한국어 'M월 D일 (요일)', 영문 'Mon, Oct 25'", () => {
  const d = new Date(Date.UTC(2026, 9, 26));
  assert.equal(dateLong(d, "ko"), "10월 26일 (" + KO["weekday." + d.getUTCDay()] + ")");
  assert.equal(dateLong(d, "en"), EN["weekday." + d.getUTCDay()] + ", Oct 26");
});

t("영문 후원: 카카오페이 링크는 영문 머리·푸터·약관·개인정보에서 빠지고 Ko-fi 는 남는다, 한국어는 그대로", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const en = toLang(html, "en");
  assert.equal(en.includes("qr.kakaopay.com"), false, "영문 틀에 카카오페이 링크");
  assert.ok(en.includes("ko-fi.com/4nhackle"), "Ko-fi 는 남는다");
  assert.ok(html.includes("qr.kakaopay.com"), "한국어 틀은 그대로");
  assert.equal(EN["foot.4"].includes("KakaoPay"), false, "영문 푸터 문단");
  for (const doc of ["terms", "privacy"]) {
    const page = fs.readFileSync(new URL("../en/" + doc + "/index.html", import.meta.url), "utf8");
    assert.equal(page.includes("qr.kakaopay.com"), false, doc + " 카카오페이 링크");
    assert.ok(page.includes("KakaoPay (Korean domestic transfer, Korean page only)"), doc + " 사실 문장");
  }
});

t("이적 이전 팀(from) '-': 경고만 내고 오류 0", () => {
  const dir = tmp("fromdash");
  for (const f of fs.readdirSync(FIX)) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "transfers.json");
  const tr = JSON.parse(fs.readFileSync(file, "utf8"));
  tr.players[0].from = "-";
  fs.writeFileSync(file, JSON.stringify(tr));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /transfers\.players\[0\] .*이전 팀\(from\)이 비어 있습니다/);
  assert.doesNotMatch(r.stdout + r.stderr, /오류  transfers/);
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log(`\n단위 시험 ${n}개 통과`);
