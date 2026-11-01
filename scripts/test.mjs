// 단위 시험: 날짜 계산, ID, 주소 읽기, 인덱스, 팀 로스터. node:assert 만 쓴다.
// 실행: node scripts/test.mjs  (실패하면 종료 코드 1). 날짜는 모두 기준일을 인자로 고정해서, 실행하는 날과 무관하다.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ageOf, contractState, careerOf, slugOf, ID_RE, buildIndex, teamMoves, toItem, watchMeta, pillOf, cls } from "../js/model.js";
import { splitNote } from "../js/views/common.js";
import { parseRoute } from "../js/state.js";
import { refuseReason, prepareOut, MARK } from "./out-dir.mjs";

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
  assert.deepEqual(pillOf({ status: "계약 완료(Sentinels)", conf: "R" }), ["signed", "Sentinels 합류", "reported"]);
});
t("pillOf: 확정 표현 계약 완료(C)는 확정", () => {
  assert.deepEqual(pillOf({ status: "계약 완료(Mandatory)", conf: "C" }), ["signed", "Mandatory 합류", "confirmed"]);
});
t("pillOf: 이적 행은 발표일이 숫자면 R 이어도 확정, 없고 R 이면 보도", () => {
  assert.deepEqual(pillOf(mv({ conf: "R", signedDate: 46320 })), ["signed", "B 합류", "confirmed"]);
  assert.deepEqual(pillOf(mv({ conf: "R" })), ["signed", "B 합류", "reported"]);
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

console.log(`\n단위 시험 ${n}개 통과`);
