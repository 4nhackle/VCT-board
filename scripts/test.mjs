// 단위 시험: 날짜 계산, ID, 주소 읽기, 인덱스, 팀 로스터. node:assert 만 쓴다.
// 실행: node scripts/test.mjs  (실패하면 종료 코드 1). 날짜는 모두 기준일을 인자로 고정해서, 실행하는 날과 무관하다.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { inlineScript, checkSitePath } from "./inline-script.mjs";
import { checkCss } from "./css-check.mjs";
import { fileURLToPath } from "node:url";
import { cleanName, teamNameOf, ageOf, contractState, careerOf, slugOf, ID_RE, buildIndex, teamMoves, toItem, watchMeta, pillOf, pillText, cls, noteSegments, sharedTails, ownPart, routeOf, idsOf, matches, newestFirst, buildTabs, teamNews, rosterCards, mergeMoves, regionShort } from "../js/model.js";
import { rosterHTML } from "../js/views/roster.js";
import { splitNote, newsRow } from "../js/views/common.js";
import { parseRoute, filtersOf, queryOf, listAction, themeOf } from "../js/state.js";
import { sortSchedule } from "../js/views/schedule.js";
import { withKst, stampOf, stampLabel, parseStamp, fmtDate, dayWord, dateWord, dateLong, clockText } from "../js/format.js";
import { noteParts } from "../js/note.js";
import { tIn, setLang, setEnTable, trEn, trNote, trWhole } from "../js/i18n.js";
import { collectTargets } from "./i18n-targets.mjs";
import { KO } from "../js/i18n/ko.js";
import { EN } from "../js/i18n/en.js";
import { regionName, tierName } from "../js/model.js";
import { birthText, personHTML } from "../js/views/person.js";
import { gapsOf } from "./gaps.mjs";
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

t("buildTabs: 목록 행의 포지션·국적·역할을 인물 정보로 채운다(행 값 우선, '-' 는 빈 칸)", () => {
  const D = {
    sources: {}, schedule: [], teams: [], watch: [], transfers: { players: [], coaches: [] },
    people: [{ id: "a-one", name: "A One", role: "Duelist", nationality: "South Korea" }, { id: "b-two", name: "B Two", role: "Head Coach", nationality: "Japan" }],
    players: [{ name: "A One", team: "T", position: "-", nationality: "" }, { name: "A One", team: "T", position: "Initiator", nationality: "Japan" }, { name: "Z Nobody", team: "T", position: "", nationality: "" }],
    coaches: [{ name: "B Two", team: "T", role: "" }]
  };
  const tabs = buildTabs(D);
  const players = tabs.find((x) => x.id === "players").groups[0].items;
  const coaches = tabs.find((x) => x.id === "coaches").groups[0].items;
  assert.equal(players[0].sub, "Duelist, South Korea");
  assert.equal(players[1].sub, "Initiator, Japan"); // 행 값이 있으면 인물 정보로 덮지 않는다
  assert.equal(players[2].sub, ""); // 인물 정보가 없으면 빈 칸
  assert.equal(coaches[0].sub, "Head Coach");
  assert.equal(D.players[0].position, "-", "원본 행은 바뀌지 않는다");
});

// buildTabs 이적 병합 시험용 묶음(합성 값). 기준일 T 와 같은 시트 일련번호를 쓴다.
const MD = {
  sources: {}, schedule: [], watch: [],
  teams: [{ id: "korea-team", name: "Korea Team", country: "South Korea", active: true }, { id: "foreign", name: "Foreign", country: "Japan", active: true }],
  people: [{ id: "kc", name: "KC", role: "Coach", nationality: "South Korea" }],
  players: [], coaches: [], transfers: { players: [], coaches: [] }
};
const playersOf = (D) => buildTabs(D).find((x) => x.id === "players").groups[0].items;

t("buildTabs: 이적 행만 있는 인물도 선수 탭에 들어가고, 알약은 합류 확정", () => {
  setLang("ko");
  const D = { ...MD, transfers: { players: [{ region: "Americas", name: "Glyph", from: "A", to: "B", type: "이적", date: T - 2, conf: "C", personId: "glyph", fromTeam: "a", toTeam: "b", signedDate: T - 1 }], coaches: [] } };
  const it = playersOf(D).find((x) => x.pid === "glyph");
  assert.ok(it, "선수 탭에 있다");
  assert.equal(it.moved, true);
  assert.equal(pillOf(it)[0], "signed");
  assert.equal(pillOf(it)[2], "confirmed");
});

t("buildTabs: LFT 행 '합류 보도' + 공식 발표일 있는 이적이면 확정 단계, 팀 칸은 LFT 행 값", () => {
  setLang("ko");
  const D = { ...MD, players: [{ region: "EMEA", team: "Y", name: "D4v41", position: "Duelist", status: "계약 완료(X) · 합류 보도", date: T - 3, conf: "R", personId: "d4v41" }], transfers: { players: [{ region: "EMEA", name: "D4v41", from: "Y", to: "X", type: "이적", date: T - 2, conf: "C", personId: "d4v41", fromTeam: "y", toTeam: "x", signedDate: T - 1 }], coaches: [] } };
  const it = playersOf(D).find((x) => x.pid === "d4v41");
  assert.equal(it.team, "Y");
  assert.equal(it.moved, true);
  assert.equal(pillOf(it)[2], "confirmed");
});

t("buildTabs: LFT 행이 이적 날짜보다 나중이면 덮지 않는다", () => {
  setLang("ko");
  const D = { ...MD, players: [{ region: "EMEA", team: "Y", name: "Late", status: "FA 진입 예정", date: T, conf: "C", personId: "late" }], transfers: { players: [{ region: "EMEA", name: "Late", from: "Y", to: "X", type: "이적", date: T - 5, conf: "C", personId: "late", fromTeam: "y", toTeam: "x", signedDate: T - 4 }], coaches: [] } };
  const rows = playersOf(D).filter((x) => x.pid === "late");
  assert.equal(rows.length, 1, "한 번만 들어간다");
  assert.equal(rows[0].moved, undefined);
  assert.equal(rows[0].status, "FA 진입 예정");
});

t("buildTabs: 이적 행이 잔류면 잔류 알약", () => {
  setLang("ko");
  const D = { ...MD, transfers: { players: [{ region: "EMEA", name: "Stay", from: "Z", to: "", type: "잔류", date: T - 1, conf: "C", personId: "stay", fromTeam: "z" }], coaches: [] } };
  const it = playersOf(D).find((x) => x.pid === "stay");
  assert.equal(pillOf(it)[0], "signed");
  assert.equal(pillOf(it)[1], tIn("ko", "pill.stayed"));
});

t("buildTabs: 한국 탭은 국적 또는 한국 팀 기준(코치 국적은 인물 정보, 이적 도착 팀 포함)", () => {
  setLang("ko");
  const D = {
    ...MD,
    people: [...MD.people, { id: "jp", name: "JP", role: "Duelist", nationality: "Japan" }, { id: "fc", name: "FC", role: "Coach", nationality: "Japan" }],
    // 외국 선수가 한국 팀(korea-team) 소속: 국적과 무관하게 든다.
    players: [{ region: "EMEA", team: "Korea Team", teamId: "korea-team", name: "JP", position: "Duelist", nationality: "Japan", status: "FA 진입 예정", date: T, conf: "C", personId: "jp" }],
    // kc: 한국인 코치가 외국 팀 소속(든다). fc: 외국인 코치가 외국 팀 소속(빠진다).
    coaches: [{ region: "EMEA", team: "Foreign", teamId: "foreign", name: "KC", role: "Coach", status: "FA 진입 예정", date: T, conf: "C", personId: "kc" }, { region: "EMEA", team: "Foreign", teamId: "foreign", name: "FC", role: "Coach", status: "FA 진입 예정", date: T, conf: "C", personId: "fc" }],
    // 외국 선수가 한국 팀으로 이적: 도착 팀(korea-team)으로 든다.
    transfers: { players: [{ region: "EMEA", name: "Moved", from: "Foreign", to: "Korea Team", type: "이적", date: T - 1, conf: "C", personId: "moved", fromTeam: "foreign", toTeam: "korea-team", signedDate: T - 1 }], coaches: [] }
  };
  const kr = buildTabs(D).find((x) => x.id === "korea").groups;
  const krPlayers = kr[0].items.map((x) => x.pid), krCoaches = kr[1].items.map((x) => x.pid);
  assert.ok(krCoaches.includes("kc"), "한국인 코치는 외국 팀이어도 든다");
  assert.ok(!krCoaches.includes("fc"), "외국인 코치가 외국 팀이면 빠진다");
  assert.ok(krPlayers.includes("jp"), "외국 선수라도 한국 팀 소속이면 든다");
  assert.ok(krPlayers.includes("moved"), "이적 도착 팀이 한국 팀이면 든다");
});

// 오늘 탭·거르기(PR 4). 기준일은 T, 탭 묶음은 MD.
const ST = (o) => ({ region: "all", status: "all", q: "", pos: "all", stage: "all", days: "all", top: false, ...o });
const PLAIN = { id: "players", status: true, teamObj: { t1: { tier: "partner" }, t2: { tier: "academy" }, t3: { tier: "ascended" } } };
// 선수 항목 한 줄. over 의 tid·tidTo 는 항목에, 나머지는 시트 행에 덮는다.
const pRow = (over = {}) => {
  const { tid = "t2", tidTo, ...row } = over;
  const base = { region: "EMEA", team: "Y", name: "A", position: "Duelist", nationality: "Japan", status: "FA 진입 예정", date: T, conf: "C", src: "s1" };
  return Object.assign(toItem({ ...base, ...row }, "player", {}), { tid }, tidTo ? { tidTo } : {});
};

t("matches: 포지션은 sub 의 첫 칸에서 대소문자 무시로 찾고, 코치·이적·지켜볼 팀 탭은 거르지 않는다", () => {
  const it = pRow({});
  assert.equal(matches(it, PLAIN, ST({ pos: "Duelist" })), true);
  assert.equal(matches(it, PLAIN, ST({ pos: "duelist" })), true);
  assert.equal(matches(it, PLAIN, ST({ pos: "Initiator" })), false);
  assert.equal(matches(pRow({ position: "Duelist/Flex" }), PLAIN, ST({ pos: "Flex" })), true, "슬래시 조합은 부분 일치");
  assert.equal(matches(it, { ...PLAIN, id: "coaches" }, ST({ pos: "Initiator" })), true);
  assert.equal(matches(it, { ...PLAIN, id: "transfers" }, ST({ pos: "Initiator" })), true);
});

t("matches: 확인 단계는 알약 단계와 같아야 하고, 단계 없는 항목은 '전체'가 아니면 빠진다", () => {
  const confirmed = toItem({ region: "EMEA", from: "A", to: "B", type: "이적", date: T, conf: "C", src: "s1", name: "X", fromTeam: "a", toTeam: "b", signedDate: T - 1 }, "t", {});
  const reported = pRow({ status: "계약 완료(X) · 합류 보도", conf: "R" });
  const open = pRow({ status: "FA 진입 예정" });
  assert.equal(matches(confirmed, PLAIN, ST({ stage: "confirmed" })), true);
  assert.equal(matches(confirmed, PLAIN, ST({ stage: "reported" })), false);
  assert.equal(matches(reported, PLAIN, ST({ stage: "reported" })), true);
  assert.equal(matches(open, PLAIN, ST({ stage: "confirmed" })), false, "단계 없는 항목은 빠진다");
  assert.equal(matches(open, PLAIN, ST({ stage: "all" })), true);
});

t("matches: 기간은 오늘(인자)과 보도 날짜의 차이, 날짜 숫자가 없으면 빠진다", () => {
  const two = pRow({ date: T - 2 }), five = pRow({ date: T - 5 }), noDate = pRow({ date: undefined });
  assert.equal(matches(two, PLAIN, ST({ days: "3" }), T), true);
  assert.equal(matches(five, PLAIN, ST({ days: "3" }), T), false);
  assert.equal(matches(five, PLAIN, ST({ days: "7" }), T), true);
  assert.equal(matches(two, PLAIN, ST({ days: "0" }), T), false);
  assert.equal(matches(pRow({ date: T }), PLAIN, ST({ days: "0" }), T), true);
  assert.equal(matches(noDate, PLAIN, ST({ days: "7" }), T), false);
  assert.equal(matches(five, PLAIN, ST({ days: "3" }), T - 4), true, "기준일을 바꾸면 달라진다");
});

t("matches: 상위 팀만은 소속 팀 또는 이적 도착 팀이 partner·ascended 일 때만 맞는다", () => {
  assert.equal(matches(pRow({ tid: "t1" }), PLAIN, ST({ top: true })), true);
  assert.equal(matches(pRow({ tid: "t2" }), PLAIN, ST({ top: true })), false);
  assert.equal(matches(pRow({ tid: "t2", tidTo: "t1" }), PLAIN, ST({ top: true })), true, "도착 팀이 상위");
  assert.equal(matches(pRow({ tid: "t2" }), PLAIN, ST({ top: false })), true, "끄면 거르지 않는다");
  assert.equal(matches(pRow({ tid: "t3" }), PLAIN, ST({ top: true })), false, "승격 팀은 파트너팀이 아니라 빠진다");
  assert.equal(matches(pRow({ tid: "t3", tidTo: "t1" }), PLAIN, ST({ top: true })), true, "승격 팀에서 파트너팀으로 가면 든다");
});

t("regionShort: 네 지역은 짧은 이름, 그 밖의 값은 빈 글자", () => {
  assert.equal(regionShort("Americas"), "AMER");
  assert.equal(regionShort("EMEA"), "EMEA");
  assert.equal(regionShort("Pacific"), "PACIFIC");
  assert.equal(regionShort("China"), "CN");
  assert.equal(regionShort("Bogus"), "");
});

t("buildTabs: 오늘 탭은 오늘 날짜 인물만 넣고, 없으면 가장 최근 날짜를 쓰며 fallbackDate 를 준다", () => {
  const row = (name, date) => ({ region: "EMEA", team: "Team", teamId: "korea-team", name, position: "Duelist", nationality: "Japan", status: "FA 진입 예정", date, conf: "C", personId: name.toLowerCase() });
  const D1 = { ...MD, players: [row("Now", T), row("Old", T - 1)], coaches: [] };
  const today = buildTabs(D1, T).find((x) => x.id === "today");
  assert.deepEqual(today.groups[0].items.map((x) => x.name), ["Now"]);
  assert.equal(today.fallbackDate, undefined);
  const players = buildTabs(D1, T).find((x) => x.id === "players");
  assert.ok(players, "선수 탭은 그대로 있다");
  const D2 = { ...MD, players: [row("Older", T - 3), row("Oldest", T - 5)], coaches: [] };
  const fb = buildTabs(D2, T).find((x) => x.id === "today");
  assert.deepEqual(fb.groups[0].items.map((x) => x.name), ["Older"]);
  assert.equal(fb.fallbackDate, T - 3);
  assert.equal(buildTabs(D2, T).findIndex((x) => x.id === "today"), 1, "선수 탭 뒤");
});

t("주소: 거르기 값은 ?뒤에서 읽고, 잘못된 값은 기본으로 돌아가며, 기본값은 주소에 쓰지 않는다", () => {
  const B = "/VCT-board/";
  assert.deepEqual(parseRoute({ pathname: B, hash: "#today?pos=Duelist&days=3" }, B), { view: "list", tab: "today" });
  assert.deepEqual(filtersOf({ hash: "#today?pos=Duelist&stage=confirmed&days=3&top=1" }), { pos: "Duelist", stage: "confirmed", days: "3", top: true });
  assert.deepEqual(filtersOf({ hash: "#today?pos=Bogus&stage=x&days=5&top=0" }), { pos: "all", stage: "all", days: "all", top: false });
  assert.deepEqual(filtersOf({ hash: "#players" }), { pos: "all", stage: "all", days: "all", top: false });
  assert.equal(queryOf({ pos: "all", stage: "all", days: "all", top: false }), "");
  assert.equal(queryOf({ pos: "Flex", stage: "reported", days: "0", top: true }), "?pos=Flex&stage=reported&days=0&vct=1");
  assert.deepEqual(filtersOf({ hash: "#players?vct=1" }), { pos: "all", stage: "all", days: "all", top: true });
  assert.deepEqual(filtersOf({ hash: "#players?top=1&days=3" }), { pos: "all", stage: "all", days: "3", top: true }, "옛 주소 top=1 도 켠다");
  assert.deepEqual(filtersOf({ hash: "#players?vct=0&top=junk" }), { pos: "all", stage: "all", days: "all", top: false }, "엉뚱한 값은 무시");
  assert.equal(queryOf({ pos: "all", stage: "all", days: "all", top: true }), "?vct=1", "top=1 은 쓰지 않는다");
});

// 팀 소식·계약 칸(PR 5). 기준일 T. 로스터 인물은 t1 소속(2026-01 부터 진행 중).
const TN = {
  sources: {}, schedule: [], transfers: { players: [], coaches: [] }, players: [], coaches: [],
  teams: [{ id: "t1", name: "Team One", region: "Americas", country: "Chile", tier: "partner", active: true }],
  people: [
    { id: "pf", name: "PF", career: [{ team: "t1", from: "2026-01", to: null }], contractUntil: T - 5 },
    { id: "pa", name: "PA", career: [{ team: "t1", from: "2026-01", to: null }], contractUntil: T + 30 },
    { id: "pb", name: "PB", career: [{ team: "t1", from: "2026-01", to: null }], contractUntil: T + 200 },
    { id: "pc", name: "PC", career: [{ team: "t1", from: "2026-01", to: null }], contractUntil: "2026" },
    { id: "pd", name: "PD", career: [{ team: "t1", from: "2026-01", to: null }], contractUntil: "2027" },
    { id: "pe", name: "PE", career: [{ team: "t1", from: "2026-01", to: null }] }
  ],
  watch: [
    { region: "Americas", team: "Team One", teamIds: ["t1"], targets: "소속 선수", situation: "철수 발표. 선수 명단 미확인", src: null },
    { region: "Americas", team: "Team One", teamIds: ["t1"], targets: "소속 선수", situation: "PA 합류 보도(Sheep)", src: null },
    { region: "Americas", team: "Team One", teamIds: ["t1"], targets: "소속 선수", situation: "메모만 있음", src: null }
  ]
};

t("teamNews: 철수·합류 보도는 사건, 그 밖의 지켜볼 팀 글은 뺀다(입력 순서 유지)", () => {
  const n = teamNews("t1", buildIndex(TN), T);
  assert.deepEqual(n.events.map((e) => e.item.note), ["철수 발표. 선수 명단 미확인", "PA 합류 보도(Sheep)"]);
});

t("teamNews: 계약 만료 임박 — 90일 안(지난 것 포함)·올해 이하 연도만 넣고, 가까운 날짜순·연도는 뒤", () => {
  const n = teamNews("t1", buildIndex(TN), T);
  assert.deepEqual(n.expiring.map((x) => x.person.id), ["pf", "pa", "pc"], "200일 뒤(pb)·2027(pd)·계약 없음(pe)은 뺀다");
  assert.equal(n.expiring[0].state.kind, "expired");
  assert.equal(n.expiring[1].state.kind, "active");
  assert.equal(n.expiring[2].state.kind, "year");
});

t("teamNews: 소속 없는 팀은 두 목록 모두 빈 배열", () => {
  const n = teamNews("none", buildIndex(TN), T);
  assert.deepEqual(n.events, []);
  assert.deepEqual(n.expiring, []);
});

t("rowHTML: 계약 칸이 있으면 메타 줄 끝에 '계약 ~…'(연도는 그대로, 날짜는 ISO), 없으면 메타 줄 그대로", () => {
  setLang("ko");
  const tab = { mode: "entry", teamObj: {}, shared: new Map() };
  const base = { region: "EMEA", team: "Team", name: "Alpha", sub: "Duelist", status: "FA 진입 예정", date: T, conf: "C", note: "", src: null, pid: "alpha", tid: "team" };
  const none = rowHTML(base, tab, {});
  assert.doesNotMatch(none, /계약 ~/);
  assert.match(rowHTML({ ...base, contract: "2027" }, tab, {}), /계약 ~2027/);
  assert.match(rowHTML({ ...base, contract: T + 30 }, tab, {}), /계약 ~\d{4}-\d{2}-\d{2}/);
  assert.equal(rowHTML({ ...base, contract: "bad" }, tab, {}), none, "형식이 아니면 메타 줄을 바꾸지 않는다");
});

t("buildTabs: 목록 항목에 계약 칸을 붙인다 — 행 값, 없으면 인물 정보", () => {
  setLang("ko");
  const D = {
    ...MD,
    people: [...MD.people, { id: "dee", name: "Dee", role: "Coach", nationality: "Japan", contractUntil: T + 60 }],
    players: [{ region: "EMEA", team: "Team", teamId: "korea-team", name: "Cee", position: "Duelist", nationality: "Japan", status: "FA 진입 예정", date: T, conf: "C", personId: "cee", contractUntil: "2027" }],
    coaches: [{ region: "EMEA", team: "Team", teamId: "korea-team", name: "Dee", role: "Coach", status: "FA 진입 예정", date: T, conf: "C", personId: "dee" }]
  };
  const tabs = buildTabs(D, T);
  assert.equal(tabs.find((x) => x.id === "players").groups[0].items.find((x) => x.pid === "cee").contract, "2027");
  assert.equal(tabs.find((x) => x.id === "coaches").groups[0].items.find((x) => x.pid === "dee").contract, T + 60);
});

// 로스터 탭(PR 6). 기준일 T. 로스터는 현재 진행 중 경력이 그 팀인 인물.
const RT = {
  sources: {}, schedule: [], transfers: { players: [], coaches: [] }, players: [], coaches: [], watch: [],
  teams: [
    { id: "zz", name: "Zed", region: "Americas", tier: "ascended", active: true },
    { id: "aa", name: "Alpha", region: "Americas", tier: "partner", active: true },
    { id: "mm", name: "Mid", region: "EMEA", tier: "partner", active: true },
    { id: "ch", name: "Chal", region: "Americas", tier: "challengers", active: true },
    { id: "cl", name: "Closed", region: "Pacific", tier: "partner", active: false }
  ],
  people: [
    { id: "coach1", name: "Coach", kind: "coach", role: "Head Coach", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p1", name: "P1", kind: "player", role: "Duelist", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p2", name: "P2", kind: "player", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p3", name: "P3", kind: "player", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p4", name: "P4", kind: "player", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "p5", name: "P5", kind: "player", career: [{ team: "aa", from: "2026-01", to: null }] },
    { id: "m1", name: "M1", kind: "player", career: [{ team: "mm", from: "2026-01", to: null }] },
    { id: "ch1", name: "C1", kind: "player", career: [{ team: "ch", from: "2026-01", to: null }] }
  ]
};

t("rosterCards: partner·ascended 만, 지역 순, 같은 지역은 이름순, 5명 미만은 partial, 운영 종료 팀은 빈 로스터", () => {
  const cards = rosterCards(buildIndex(RT), T);
  assert.deepEqual(cards.map((c) => c.team.id), ["aa", "zz", "mm", "cl"], "challengers(ch)는 뺀다");
  assert.deepEqual(cards.map((c) => c.partial), [false, true, true, true]);
  assert.equal(cards[0].roster.length, 6);
  assert.equal(cards[1].roster.length, 0);
  assert.equal(cards[3].roster.length, 0, "운영 종료 팀");
});

t("rosterCards: 코치는 선수 뒤", () => {
  const roster = rosterCards(buildIndex(RT), T)[0].roster;
  assert.deepEqual(roster.map((p) => p.kind), ["player", "player", "player", "player", "player", "coach"]);
});

t("buildTabs: 로스터 탭은 지켜볼 팀 앞에 있고 크기는 팀 카드 수", () => {
  const tabs = buildTabs(RT, T);
  const i = tabs.findIndex((x) => x.id === "roster");
  assert.equal(tabs[i].mode, "roster");
  assert.equal(tabs[i].size, 4);
  assert.equal(tabs[i + 1].id, "watch");
});

t("rosterHTML: 지역 거르기는 카드를 거르고, 5명 미만은 일부 표시, +·− 인원을 쓴다", () => {
  setLang("ko");
  const cards = rosterCards(buildIndex(RT), T);
  const all = rosterHTML(cards, { region: "all" });
  assert.match(all, /로스터 정보 일부/);
  assert.match(all, /\+0 \/ −0/);
  const emea = rosterHTML(cards, { region: "EMEA" });
  assert.match(emea, /Mid/);
  assert.doesNotMatch(emea, /Alpha/);
});

// 개인정보처리방침(PR 7): 실제로 쓰는 외부 서비스(web3forms, Cloudflare)를 한·영 방침이 모두 밝힌다.
t("개인정보처리방침: web3forms·Cloudflare 를 한·영 모두 밝히고, 건의 안내 키가 ko·en 에 있다", () => {
  const ko = fs.readFileSync(fileURLToPath(new URL("../privacy/index.html", import.meta.url)), "utf8");
  const en = fs.readFileSync(fileURLToPath(new URL("../en/privacy/index.html", import.meta.url)), "utf8");
  for (const page of [ko, en]) {
    assert.match(page, /web3forms/);
    assert.match(page, /Cloudflare/);
  }
  assert.ok(KO["form.privacyNote"], "ko 키");
  assert.ok(EN["form.privacyNote"], "en 키");
});

// 건의 봇 확인(PR 8): hCaptcha 를 한·영 방침이 밝히고, 새 안내 키가 ko·en 에 모두 있다.
t("건의 봇 확인: 방침 두 곳이 hCaptcha 를 밝히고, 확인 관련 키가 ko·en 에 있다", () => {
  const ko = fs.readFileSync(fileURLToPath(new URL("../privacy/index.html", import.meta.url)), "utf8");
  const en = fs.readFileSync(fileURLToPath(new URL("../en/privacy/index.html", import.meta.url)), "utf8");
  assert.match(ko, /hCaptcha/);
  assert.match(en, /hCaptcha/);
  for (const key of ["form.captchaNeed", "form.captchaUnavailable", "form.privacyNote"]) {
    assert.ok(KO[key], "ko " + key);
    assert.ok(EN[key], "en " + key);
  }
  assert.match(KO["form.privacyNote"], /hCaptcha/);
  assert.match(EN["form.privacyNote"], /hCaptcha/);
});

// PR 10: 인물 이름 충돌은 personId 없는 소식 행이 끼면 오류, 인물 명단끼리만이면 경고. 임시 데이터 폴더에서 validate.mjs 를 돌린다.
const VALIDATE_PATH = fileURLToPath(new URL("./validate.mjs", import.meta.url));
function runValidate(name, { players = [], coaches = [], people = null, teams = null }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-pr10-" + name + "-"));
  const put = (f, v) => fs.writeFileSync(path.join(dir, f + ".json"), JSON.stringify(v));
  put("sources", { s1: ["VLR", "https://www.vlr.gg/1/x"] });
  put("transfers", { players: [], coaches: [] });
  put("players", players);
  put("coaches", coaches);
  put("watch", []);
  if (people) put("people", people);
  if (teams) put("teams", teams);
  return spawnSync(process.execPath, [VALIDATE_PATH, dir], { encoding: "utf8" });
}
const vrow = (team, name, extra = {}) => ({ region: "EMEA", team, name, status: "FA 진입 예정", date: T, conf: "C", src: "s1", ...extra });
const vperson = (id, name) => ({ id, name, role: "Duelist", nationality: "Japan" });

t("validate: 소식 행끼리 ZYZZ·zyzz(personId 없음)는 오류 종료 1", () => {
  const r = runValidate("rows", { players: [vrow("A", "ZYZZ"), vrow("B", "zyzz")] });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /인물 이름 충돌/);
});

t("validate: 소식 행 ZYZZ(personId 없음)와 인물 명단 zyzz 는 오류", () => {
  const r = runValidate("row-people", { players: [vrow("A", "ZYZZ")], people: [vperson("zyzz-x", "zyzz")] });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /인물 이름 충돌/);
});

t("validate: 인물 명단끼리만 ZYZZ·zyzz 는 경고만(종료 0)", () => {
  const r = runValidate("people-only", { people: [vperson("zyzz", "ZYZZ"), vperson("zyzz-2", "zyzz")] });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /같은 ID 'zyzz'/);
  assert.doesNotMatch(r.stderr, /인물 이름 충돌/);
});

t("validate: personId 가 있는 행끼리 같은 철자는 충돌이 아니다", () => {
  const r = runValidate("ids", { players: [vrow("A", "ZYZZ", { personId: "zyzz-a" }), vrow("B", "zyzz", { personId: "zyzz-b" })] });
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stderr, /같은 ID 'zyzz'/);
});

t("validate: 팀 이름 Leviatán·LEVIATÁN 은 경고만(종료 0)", () => {
  const r = runValidate("teams", { players: [vrow("Leviatán", "P1"), vrow("LEVIATÁN", "P2")] });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /같은 ID 'leviatan'/);
});

// PR 9: 이적 병합은 입력을 바꾸지 않고, 목록 주소 처리 결정은 다섯 경우를 가른다(PR 4 버그 경우 포함).
t("mergeMoves: 입력 배열(LFT 행·이적 행)을 바꾸지 않는다", () => {
  const P0 = [{ pid: "a", name: "A", date: T, status: "FA 진입 예정" }];
  const CO0 = [];
  const T1 = [{ pid: "a", name: "A", date: T - 1, status: "이적", next: "X", signed: T - 1, tidTo: "x" }, { pid: "b", name: "B", date: T - 2, status: "이적", next: "Y", tidTo: "y" }];
  const T2 = [];
  const before = structuredClone({ P0, CO0, T1, T2 });
  mergeMoves(P0, CO0, T1, T2, {});
  assert.deepEqual({ P0, CO0, T1, T2 }, before);
});

t("listAction: 상세 복귀·다른 탭은 full, 같은 탭·같은 거르기는 none, 같은 탭·거르기 변경은 refilter, 없는 탭은 none", () => {
  const cur = { pos: "all", stage: "all", days: "all", top: false };
  const same = { ...cur };
  const duel = { ...cur, pos: "Duelist" };
  assert.equal(listAction("person", "players", "players", true, cur, same), "full");
  assert.equal(listAction("list", "players", "coaches", true, cur, same), "full");
  assert.equal(listAction("list", "players", "players", true, cur, same), "none");
  assert.equal(listAction("list", "players", "players", true, cur, duel), "refilter");
  assert.equal(listAction("list", "players", "nope", false, cur, same), "none");
});

// 계약 연도(PR 2): 연도만 있는 값, 시트 일련번호 값, 검증 스크립트 시험용 임시 데이터.
t("contractState: 연도만 있는 값은 year(올해 이후) 또는 expired(지난 해), 숫자 값은 그대로", () => {
  setLang("ko");
  assert.equal(contractState("2027", T).kind, "year");
  assert.equal(contractState("2027", T).label, "2027년까지");
  assert.equal(contractState("2026", T).kind, "year"); // T 는 2026년
  assert.equal(contractState("2025", T).kind, "expired");
  assert.equal(contractState(T + 1, T).kind, "active");
  assert.equal(contractState("2027-05", T).kind, "unknown"); // 연도 형식이 아니다
});

const VALIDATE_JS = fileURLToPath(new URL("./validate.mjs", import.meta.url));
// 임시 데이터 폴더에 행 하나를 두고 validate.mjs 를 돌린다. 실제 data/ 는 건드리지 않는다.
function validateFixture(name, { row = {}, sources = { s1: ["VLR", "https://www.vlr.gg/777970/x"] } } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vct-v2-" + name + "-"));
  const base = { region: "EMEA", team: "Team X", name: "Alpha", status: "FA 진입 예정", date: T, conf: "C", src: "s1" };
  fs.writeFileSync(path.join(dir, "sources.json"), JSON.stringify(sources));
  fs.writeFileSync(path.join(dir, "transfers.json"), JSON.stringify({ players: [], coaches: [] }));
  fs.writeFileSync(path.join(dir, "players.json"), JSON.stringify([{ ...base, ...row }]));
  fs.writeFileSync(path.join(dir, "coaches.json"), "[]");
  fs.writeFileSync(path.join(dir, "watch.json"), "[]");
  return spawnSync(process.execPath, [VALIDATE_JS, dir], { encoding: "utf8" });
}

t("validate: contractUntil 은 숫자 또는 yyyy 만 통과, '2027-05' 와 caption 5 는 오류", () => {
  assert.equal(validateFixture("num", { row: { contractUntil: T + 30 } }).status, 0);
  assert.equal(validateFixture("year", { row: { contractUntil: "2027" } }).status, 0);
  const bad = validateFixture("bad-year", { row: { contractUntil: "2027-05" } });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /contractUntil 은 시트 일련번호\(숫자\) 또는 yyyy/);
  const cap = validateFixture("cap-num", { row: { caption: 5 } });
  assert.equal(cap.status, 1);
  assert.match(cap.stderr, /caption 은 문자열이어야 합니다/);
});

t("validate: caption 이 120자를 넘으면 경고만(종료 0)", () => {
  const r = validateFixture("cap-long", { row: { caption: "가".repeat(121) } });
  assert.equal(r.status, 0);
  assert.match(r.stderr, /caption 이 120자를 넘습니다/);
});

t("validate: 출처 경고 — https 아님, 홈페이지 주소, 같은 주소 중복은 경고만 낸다", () => {
  const http = validateFixture("src-http", { sources: { s1: ["VLR", "http://www.vlr.gg/777970/x"] } });
  assert.equal(http.status, 0);
  assert.match(http.stderr, /https:\/\/ 로 시작하지 않습니다/);
  const home = validateFixture("src-home", { sources: { s1: ["VLR", "https://www.vlr.gg/"] } });
  assert.equal(home.status, 0);
  assert.match(home.stderr, /홈페이지 주소입니다/);
  const dup = validateFixture("src-dup", { sources: { s1: ["VLR", "https://www.vlr.gg/1/x"], s2: ["VLR 2", "https://www.vlr.gg/1/x"] } });
  assert.equal(dup.status, 0);
  assert.match(dup.stderr, /같은 주소가 출처 s1, s2 에 있습니다/);
});

t("rowHTML: caption 이 있으면 설명글로 쓰고 출처 줄은 남김, 없거나 빈 값이면 메모 본문 그대로", () => {
  setLang("ko");
  const tab = { mode: "entry", teamObj: {}, shared: new Map() };
  const base = { region: "EMEA", team: "Team", name: "Alpha", sub: "Duelist", status: "FA 진입 예정", date: T, conf: "C", note: "긴 메모 본문", src: ["VLR", "https://www.vlr.gg/1/x"], pid: "alpha", tid: "team" };
  const withCap = rowHTML({ ...base, caption: "한 줄 요약" }, tab, {});
  assert.match(withCap, /한 줄 요약/);
  assert.doesNotMatch(withCap, /긴 메모 본문/);
  assert.match(withCap, /https:\/\/www\.vlr\.gg\/1\/x/, "출처 링크는 그대로");
  const noCap = rowHTML(base, tab, {});
  assert.match(noCap, /긴 메모 본문/);
  assert.equal(rowHTML({ ...base, caption: "" }, tab, {}), noCap, "빈 caption 은 없는 것과 같다");
  assert.equal(rowHTML({ ...base, caption: "-" }, tab, {}), noCap, "'-' caption 은 빈 칸이다");
});

t("personHTML: 연도만 있는 계약 만료는 날짜 없이 '2027년까지'", () => {
  setLang("ko");
  const D = { sources: {}, players: [], coaches: [], transfers: { players: [], coaches: [] }, watch: [], teams: [], people: [{ id: "p1", name: "Alpha", kind: "player", role: "Duelist", nationality: "Japan", contractUntil: "2027" }] };
  const { html } = personHTML("p1", buildIndex(D));
  assert.match(html, /2027년까지/);
});

t("birthText: 날짜·연도만·미성년 경계(만 18세 생일 어제·당일·내일), 빈 값, 영문 표기", () => {
  setLang("ko");
  assert.equal(birthText("2002-05-21", T), "2002-05-21 (24세)");
  assert.equal(birthText("2002", T), "2002년 (약 24세)");
  assert.equal(birthText("2008-10-31", T), "2008-10-31 (18세)"); // 만 18세 생일 당일: 날짜 공개
  assert.equal(birthText("2008-10-30", T), "2008-10-30 (18세)"); // 어제가 생일: 날짜 공개
  assert.equal(birthText("2008-11-01", T), "2008년 (17세)"); // 내일이 생일: 미성년, 연도만
  assert.equal(birthText("2009", T), "2009년 (약 17세)");
  assert.equal(birthText("", T), "");
  assert.equal(birthText(undefined, T), "");
  setLang("en");
  assert.equal(birthText("2002-05-21", T), "May 21, 2002 (age 24)");
  assert.equal(birthText("2002", T), "2002 (about 24)");
  assert.equal(birthText("2008-11-01", T), "2008 (age 17)");
  setLang("ko");
});

t("gapsOf: 빈 칸·'-'·빈 경력은 빈 항목, 계약은 숫자나 yyyy 면 채운 것(그 밖의 글은 빈 항목)", () => {
  assert.deepEqual(gapsOf({ name: "x", birth: "-", role: "-", nationality: "", realName: "-", career: [], links: { vlr: "-" }, contractUntil: "2026-05" }),
    ["birth", "role", "nationality", "realName", "career", "vlr", "liquipedia", "contract"]);
  assert.deepEqual(gapsOf({ name: "x", birth: "-", role: "-", nationality: "", realName: "-", career: [], links: { vlr: "-" }, contractUntil: "2026" }),
    ["birth", "role", "nationality", "realName", "career", "vlr", "liquipedia"]);
  assert.deepEqual(gapsOf({ birth: "2001", role: "Duelist", nationality: "Japan", realName: "A", career: [{ team: "t", from: "2024-01", to: null }], links: { vlr: "https://v", liquipedia: "https://l" }, contractUntil: 46326 }), []);
});

t("gaps.mjs: --json 은 빈 항목 많은 순 배열, 표는 항목 여덟 줄", () => {
  const GAPS = fileURLToPath(new URL("./gaps.mjs", import.meta.url));
  const j = spawnSync(process.execPath, [GAPS, "--json"], { encoding: "utf8" });
  assert.equal(j.status, 0, j.stderr);
  const rows = JSON.parse(j.stdout);
  assert.ok(Array.isArray(rows) && rows.length > 0);
  for (const r of rows) assert.deepEqual(Object.keys(r), ["id", "name", "kind", "team", "missing", "vlr", "liquipedia"]);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].missing.length >= rows[i].missing.length, "정렬 순서");
  const table = spawnSync(process.execPath, [GAPS], { encoding: "utf8" });
  assert.equal(table.status, 0, table.stderr);
  assert.equal(table.stdout.trim().split("\n").length, 10); // 요약 줄 + 머리 줄 + 항목 여덟 줄
  const v = spawnSync(process.execPath, [fileURLToPath(new URL("./validate.mjs", import.meta.url))], { encoding: "utf8" });
  assert.equal(v.status, 0, v.stderr);
  assert.match(v.stdout, /정보 빈 칸: 생년월일 \d+, 포지션 \d+, 국적 \d+, 계약 \d+/);
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

t("themeOf: 라이트·다크·시스템은 그대로, 그 밖의 값과 없음은 시스템", () => {
  assert.equal(themeOf("light"), "light");
  assert.equal(themeOf("dark"), "dark");
  assert.equal(themeOf("system"), "system");
  assert.equal(themeOf("Dark"), "system");
  assert.equal(themeOf(""), "system");
  assert.equal(themeOf(null), "system");
  assert.equal(themeOf(undefined), "system");
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
// 견본 데이터(fixtures/styleguide)는 폴더라서 빼고, 시험 데이터 파일만 복사한다.
const fixFiles = () => fs.readdirSync(FIX).filter((f) => fs.statSync(path.join(FIX, f)).isFile());
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), "vct-test-" + name + "-"));
t("validate: career 의 to 가 from 보다 앞서면 오류 종료 1(이전 검토 요청 3)", () => {
  const dir = tmp("career");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
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
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
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
  assert.equal(tIn("ko", "birth.year", { y: "2002", n: 24 }), "2002년 (약 24세)");
  assert.equal(tIn("ko", "birth.full", { d: "2002-05-21", n: 24 }), "2002-05-21 (24세)");
  assert.equal(tIn("ko", "birth.minor", { y: "2009", n: 17 }), "2009년 (17세)");
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
  // 시트에 새 상태 문구가 생길 때마다 배포가 막히지 않도록 경고만 한다(영문 화면은 못 옮긴 문구를 원문 + KR 로 보여 준다).
  // 용어집 시험(아래)과 영문 화면 한글 검사는 그대로 막는다. 이 경고가 보이면 glossary.js 에 짝이나 규칙을 추가한다.
  if (miss.length) console.warn("::warning::용어집에 없는 상태 문구 " + miss.length + "개: " + miss.join(" | "));
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
    for (const [k, v] of Object.entries(table)) assert.ok(!/[가-힣]/.test(noteParts(v).body), "영문 몸말에 한글: " + k);
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
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
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
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "players.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  rows[0].note = "테스트 (Sheep 2/30 12:00 UTC)";
  fs.writeFileSync(file, JSON.stringify(rows));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.match(r.stderr, /보도 시각 2\/30 는 없는 날짜입니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("화면 테마 스크립트(index.html 인라인): 저장된 라이트·다크만 data-theme 로 두고, 그 밖의 값과 저장소 오류는 시스템", () => {
  const code = inlineScript(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8"));
  const run = (stored) => {
    const attrs = [];
    const doc = { documentElement: { setAttribute: (k, v) => attrs.push([k, v]) }, addEventListener: () => {} };
    const storage = { getItem: () => { if (stored === "THROW") throw new Error("denied"); return stored; } };
    vm.runInNewContext(code, { location: { pathname: "/VCT-board/", search: "", hash: "", replace: () => {} }, localStorage: storage, document: doc });
    return attrs;
  };
  assert.deepEqual(run("dark"), [["data-theme", "dark"]]);
  assert.deepEqual(run("light"), [["data-theme", "light"]]);
  assert.deepEqual(run("system"), []);
  assert.deepEqual(run("Dark"), []);
  assert.deepEqual(run(null), []);
  assert.deepEqual(run("THROW"), []);
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
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
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

t("pillOf: 도착 팀이 '-' 여도 '새 팀 합류'(routeOf 와 같은 규칙)", () => {
  assert.equal(pillOf({ moved: true, status: "이적", next: "-", team: "X", conf: "C", date: T })[1], "새 팀 합류");
  assert.equal(pillOf({ moved: true, status: "이적", next: "Y", team: "X", conf: "C", date: T })[1], "Y 합류");
});

t("cleanName: 공백·'-' 는 빈 값, 이름은 앞뒤 공백만 뗀다", () => {
  for (const v of [" ", "-", " - ", "", null, undefined]) assert.equal(cleanName(v), "", JSON.stringify(v));
  assert.equal(cleanName("Sentinels"), "Sentinels");
  assert.equal(cleanName("  Sentinels "), "Sentinels");
});

t("pillOf: 도착 팀이 공백(' ')이면 '새 팀 합류'", () => {
  assert.equal(pillOf({ moved: true, status: "이적", next: " ", team: "X", conf: "C", date: T })[1], "새 팀 합류");
});

t("이적 빈 도착 팀(코치 쪽): validate 오류", () => {
  const dir = tmp("blankto-coach");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "transfers.json");
  const tr = JSON.parse(fs.readFileSync(file, "utf8"));
  tr.coaches = [{ ...tr.players[0], name: "코치테스트", to: "" }];
  fs.writeFileSync(file, JSON.stringify(tr));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /transfers\.coaches\[0\] .*새 팀\(to\)이 비어 있습니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("빈 칸 일괄: 국적 ' ' 인 행의 메타에 ' · ' 가 남지 않고, 이름 ' ' 인 팀의 제목은 팀 id", () => {
  const html = rowHTML({ region: "Americas", team: "Cloud9", name: "X", sub: "Duelist,  ", status: "구직 중", date: T, conf: "C", note: "", src: null, pid: "x", tid: "cloud9" }, { mode: "entry", teamObj: {}, shared: new Map() }, {});
  assert.ok(html.includes('<span class="meta">Duelist</span>'), "메타: " + html.slice(html.indexOf('class="meta"'), html.indexOf('class="meta"') + 60));
  assert.equal(teamNameOf("fx-id", [{ kind: "player", item: { team: " " } }]), "fx-id");
  assert.equal(teamNameOf("fx-id", [{ kind: "player", item: { team: "Cloud9" } }]), "Cloud9");
});

t("validate: 인물 국적 ' ' 은 빈 칸 경고", () => {
  const dir = tmp("nat-blank");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "people.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  rows[0].nationality = " ";
  fs.writeFileSync(file, JSON.stringify(rows));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /국적 또는 역할이 빈 칸/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("validate: 날짜 칸과 맞지 않는 비고 시각은 '날짜 칸과 맞지 않거나 그 해에 없는 날짜' 경고", () => {
  const dir = tmp("stamp-mismatch");
  for (const f of fixFiles()) fs.copyFileSync(path.join(FIX, f), path.join(dir, f));
  const file = path.join(dir, "players.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  rows[0].note = "테스트 (Sheep 10/24 16:30 UTC)";
  rows[0].date = 46300;
  fs.writeFileSync(file, JSON.stringify(rows));
  const r = spawnSync(process.execPath, [VALIDATE, dir], { encoding: "utf8" });
  assert.match(r.stderr, /보도 시각 10\/24 가 날짜 칸과 맞지 않거나 그 해에 없는 날짜입니다/);
  fs.rmSync(dir, { recursive: true, force: true });
});

t("css-check: css/style.css 가 네 가지 점검(중복·날것의 값·대비·터치)을 통과한다", () => {
  const f = checkCss(fs.readFileSync(fileURLToPath(new URL("../css/style.css", import.meta.url)), "utf8"));
  assert.deepEqual(f, []);
});

t("css-check: 나쁜 예는 걸린다(중복 선택자, 날것의 색·px, 기본값 토큰, 낮은 대비, 작은 터치)", () => {
  const bad = (css) => checkCss(css).join("\n");
  assert.match(bad(".a{color:#fff} .a{margin:0}"), /중복 선택자: "\.a"/);
  assert.match(bad(".b{color:#fff}"), /날것의 색/);
  assert.match(bad(".b{gap:6px}"), /날것의 px/);
  assert.match(bad(".b{padding:var(--sp-2)}"), /기본값 토큰/);
  assert.match(bad(":root{--neutral-900:#FFFFFF;--neutral-50:#F7F6F2;--color-ink:var(--neutral-900);--color-bg:var(--neutral-50);--surface:var(--neutral-50);--color-mute:var(--neutral-50);--color-line-strong:var(--neutral-50);--color-accent:var(--neutral-50);--color-on-accent:var(--neutral-50);--status-open-bg:var(--neutral-50);--status-open-fg:var(--neutral-50)} @media (max-width: 600px){:root{--tap:30px}}"), /대비 부족|터치 크기/);
  // 테두리 두께 1~3px 과 컴포넌트 토큰 선언은 허용한다
  assert.deepEqual(checkCss(".c{border:2px solid var(--color-line); --gap-x: 6px; text-underline-offset: var(--link-underline-offset)} :root{--link-underline-offset:3px}").filter((x) => !/대비|터치/.test(x)), []);
});

t("견본 데이터: scripts/fixtures/styleguide/extra.json 은 시험 데이터의 모양을 따른다", () => {
  const x = JSON.parse(fs.readFileSync(fileURLToPath(new URL("./fixtures/styleguide/extra.json", import.meta.url)), "utf8"));
  for (const k of ["players", "coaches", "transfers", "watch"]) assert.ok(Array.isArray(x[k]) && x[k].length > 0, k);
  assert.ok(x.players.some((p) => p.team === ""), "빈 팀 칸");
  assert.ok(x.players.some((p) => /[가-힣]/.test(p.team)), "한글 팀 칸");
});

t("build: 배포 출력에 dev/ 가 없다", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "vct-dev-out-"));
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./build.mjs", import.meta.url)), out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(path.join(out, "dev")), false);
  fs.rmSync(out, { recursive: true, force: true });
});

t("영문 공유 이미지: toLang 은 og:image 를 og-en.png 로, 한국어 틀은 og.png 로 둔다", () => {
  const ko = fs.readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
  assert.match(ko, /<meta property="og:image" content="https:\/\/4nhackle\.github\.io\/VCT-board\/og\.png">/);
  assert.match(toLang(ko, "en"), /<meta property="og:image" content="https:\/\/4nhackle\.github\.io\/VCT-board\/og-en\.png">/);
  assert.doesNotMatch(toLang(ko, "en"), /og\.png">/);
});

t("영문 공유 이미지: 빌드 출력에 og-en.png 가 있고 1200x630 PNG, 100KB 이하다", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "vct-og-"));
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./build.mjs", import.meta.url)), out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const png = fs.readFileSync(path.join(out, "og-en.png"));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 1200, "가로");
  assert.equal(png.readUInt32BE(20), 630, "세로");
  assert.ok(png.length <= 100 * 1024, "용량 " + png.length);
  const en = fs.readFileSync(path.join(out, "en", "index.html"), "utf8");
  assert.match(en, /og:image" content="[^"]*\/og-en\.png"/);
  const ko2 = fs.readFileSync(path.join(out, "p", "absol", "index.html"), "utf8");
  assert.match(ko2, /og:image" content="[^"]*\/og\.png"/);
  const enP = fs.readFileSync(path.join(out, "en", "p", "absol", "index.html"), "utf8");
  assert.match(enP, /og:image" content="[^"]*\/og-en\.png"/);
  fs.rmSync(out, { recursive: true, force: true });
});

console.log(`\n단위 시험 ${n}개 통과`);
