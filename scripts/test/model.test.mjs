// 시험: 데이터 모델(js/model.js 와 js/model/*): 인물·이적·탭·로스터·정보 칸.
import assert from "node:assert/strict";
import { cleanName, ageOf, contractState, careerOf, slugOf, ID_RE, buildIndex, teamMoves, toItem, watchMeta, pillOf, pillText, cls, noteSegments, sharedTails, ownPart, routeOf, idsOf, matches, newestFirst, buildTabs, teamNews, rosterCards, mergeMoves, regionShort } from "../../js/model.js";
import { tIn, setLang } from "../../js/i18n.js";
import { T, t, RT, serialOf } from "./helpers.mjs";

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
const ST = (o) => ({ region: "all", status: "all", q: "", pos: "all", days: "all", top: false, ...o });

t("이적 탭 포지션: 선수 이적은 인물 role 로 채워 거르고, 인물이 없으면 포지션 거르기에서 빠진다", () => {
  setLang("ko");
  const D = { ...MD,
    people: [...MD.people, { id: "dz", name: "DZ", role: "Duelist", nationality: "Japan" }],
    transfers: { players: [
      { region: "EMEA", name: "DZ", from: "A", to: "B", type: "이적", date: T - 1, conf: "C", personId: "dz", fromTeam: "a", toTeam: "b", signedDate: T - 1 },
      { region: "EMEA", name: "Nobody", from: "A", to: "B", type: "이적", date: T - 1, conf: "C", personId: "nobody", fromTeam: "a", toTeam: "b", signedDate: T - 1 }
    ], coaches: [] } };
  const tabs = buildTabs(D);
  const tr = tabs.find((x) => x.id === "transfers");
  const it = tr.groups[0].items.find((x) => x.pid === "dz");
  assert.ok(it, "이적 탭에 든다");
  assert.match(it.sub, /^Duelist/);
  assert.equal(matches(it, tr, ST({ pos: "Duelist" }), T), true);
  assert.equal(matches(it, tr, ST({ pos: "Sentinel" }), T), false);
  const nobody = tr.groups[0].items.find((x) => x.pid === "nobody");
  assert.equal(nobody.sub, "");
  assert.equal(matches(nobody, tr, ST({ pos: "Duelist" }), T), false, "인물 정보가 없으면 빠진다");
  assert.equal(tabs.find((x) => x.id === "players").groups[0].items.filter((x) => x.pid === "dz").length, 1, "선수 탭에 한 번만 든다");
});

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
  assert.equal(matches(it, { ...PLAIN, id: "transfers" }, ST({ pos: "Initiator" })), false, "이적 탭도 포지션으로 거른다");
  assert.equal(matches(it, { ...PLAIN, id: "transfers" }, ST({ pos: "Duelist" })), true);
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

// 로스터가 이적 소식을 따른다(PR 23): 가장 최근 이적의 도착 팀이 현재 소속. 보도(발표 전)도 같다. 경력은 이적이 없을 때만 본다.
const mvRow = (pid, from, to, date, signedDate) => ({ region: "Americas", name: pid, from, to, type: "이적", date, conf: "C", src: "s", fromTeam: from, toTeam: to, personId: pid, ...(signedDate == null ? {} : { signedDate }) });

const rosterOf = (teamId, rows, career = {}) => {
  const IDX = buildIndex({ sources: SRC, players: [], coaches: [], transfers: { players: rows, coaches: [] }, watch: [] });
  IDX.people = Object.fromEntries(Object.keys(career).map(pid => [pid, { id: pid, name: pid, kind: "player", career: career[pid] }]));
  return teamMoves(teamId, IDX, T).roster.map(p => p.id);
};

t("teamMoves: 확정 이적(a→b)은 도착 팀 로스터에 들고 옛 팀에서 빠진다", () => {
  const rows = [mvRow("p1", "a", "b", T - 2, T - 1)];
  assert.deepEqual(rosterOf("b", rows, { p1: [{ team: "a", from: "2026-01", to: null }] }), ["p1"]);
  assert.deepEqual(rosterOf("a", rows, { p1: [{ team: "a", from: "2026-01", to: null }] }), []);
});

t("teamMoves: 보도(발표 전) 이적도 도착 팀 로스터에 든다", () => {
  const rows = [mvRow("p1", "a", "b", T - 2)];
  assert.deepEqual(rosterOf("b", rows, { p1: [{ team: "a", from: "2026-01", to: null }] }), ["p1"]);
  assert.deepEqual(rosterOf("a", rows, { p1: [{ team: "a", from: "2026-01", to: null }] }), []);
});

t("teamMoves: 두 번 이적(a→b, 뒤에 b→c)은 최신 도착 팀 c 에만 든다", () => {
  const rows = [mvRow("p1", "a", "b", T - 5, T - 4), mvRow("p1", "b", "c", T - 2, T - 1)];
  const career = { p1: [{ team: "a", from: "2026-01", to: null }] };
  assert.deepEqual(rosterOf("c", rows, career), ["p1"]);
  assert.deepEqual(rosterOf("b", rows, career), []);
  assert.deepEqual(rosterOf("a", rows, career), []);
});

t("teamMoves: 같은 날 이적은 발표(signed)가 있는 행이 이긴다", () => {
  const career = { p1: [{ team: "a", from: "2026-01", to: null }] };
  assert.deepEqual(rosterOf("b", [mvRow("p1", "a", "c", T - 2), mvRow("p1", "a", "b", T - 2, T - 1)], career), ["p1"]);
  assert.deepEqual(rosterOf("b", [mvRow("p1", "a", "b", T - 2, T - 1), mvRow("p1", "a", "c", T - 2)], career), ["p1"]);
  assert.deepEqual(rosterOf("c", [mvRow("p1", "a", "b", T - 2, T - 1), mvRow("p1", "a", "c", T - 2)], career), []);
});

t("teamMoves: 도착 팀이 비면(이적 나감, 행선지 없음) 어느 로스터에도 없다", () => {
  const rows = [mvRow("p1", "a", "", T - 2, T - 1)];
  const career = { p1: [{ team: "a", from: "2026-01", to: null }] };
  assert.deepEqual(rosterOf("a", rows, career), []);
  assert.deepEqual(rosterOf("b", rows, career), []);
});

t("teamMoves: 이적 행이 없는 인물은 경력 칸 규칙 그대로", () => {
  assert.deepEqual(rosterOf("c", [], { p1: [{ team: "c", from: "2026-01", to: null }] }), ["p1"]);
  assert.deepEqual(rosterOf("d", [], { p1: [{ team: "c", from: "2026-01", to: null }] }), []);
});

t("teamMoves: 이름이 constructor·toString 인 인물도 들어온·나간 집계에 한 번씩 들어감(R-03, Set)", () => {
  const tr = (name, from, to) => ({ region: "Americas", name, from, to, type: "이적", date: 46320, conf: "C", src: "s", fromTeam: from, toTeam: to });
  const D = { sources: SRC, players: [], coaches: [], transfers: { players: [tr("constructor", "t1", "t2"), tr("toString", "t2", "t1"), tr("constructor", "t1", "t2")], coaches: [] }, watch: [] };
  const m = teamMoves("t2", buildIndex(D), T);
  assert.deepEqual(m.incoming.map(e => e.item.pid), ["constructor"]); // 같은 인물 두 번은 한 번만
  assert.deepEqual(m.outgoing.map(e => e.item.pid), ["tostring"]);
  assert.equal(teamMoves("t1", buildIndex(D), T).outgoing.length, 1);
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
