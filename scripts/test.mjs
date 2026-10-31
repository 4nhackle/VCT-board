// 단위 시험: 날짜 계산, ID, 주소 읽기, 인덱스, 팀 로스터. node:assert 만 쓴다.
// 실행: node scripts/test.mjs  (실패하면 종료 코드 1). 날짜는 모두 기준일을 인자로 고정해서, 실행하는 날과 무관하다.
import assert from "node:assert/strict";
import { ageOf, contractState, careerOf, slugOf, ID_RE, buildIndex, teamMoves, toItem } from "../js/model.js";
import { parseRoute } from "../js/state.js";
import { refuseReason } from "./out-dir.mjs";

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

console.log(`\n단위 시험 ${n}개 통과`);
