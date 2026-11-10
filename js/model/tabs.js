// 이적 합치기, 탭 목록 만들기, 목록 거르기.
import { TODAY } from "../format.js";
import { t } from "../i18n.js";
import { regionName } from "./labels.js";
import { dayOf, own, toItem, idsOf, cleanName } from "./ids.js";
import { cls } from "./status.js";
import { sharedTails } from "./notes.js";
import { contractOK, rosterCards, buildIndex } from "./people.js";

// LFT 행과 이적 행을 합친다. 반환: { P, CO } (입력 배열은 바꾸지 않는다).
export function mergeMoves(P0, CO0, T1, T2, PEOPLE) {
  // 인물별 가장 최근 이적: 날짜 최신순, 같은 날이면 공식 발표일(signedDate)이 있는 행.
  var latest = Object.create(null);
  [T1, T2].forEach(function (rows) {
    rows.forEach(function (m) {
      if (!m.pid) return;
      var cur = own(latest, m.pid);
      if (!cur || dayOf(m.date) > dayOf(cur.date) || (dayOf(m.date) === dayOf(cur.date) && typeof m.signed === "number" && typeof cur.signed !== "number")) latest[m.pid] = m;
    });
  });
  // LFT 행에 같은 인물의 이적이 있고 이적이 LFT 행과 같은 날이거나 나중이면, 이적 쪽 상태(도착 팀·발표일 등)를 쓴다.
  function mergeMove(it) {
    var mv = own(latest, it.pid);
    if (!mv || dayOf(mv.date) < dayOf(it.date)) return it;
    return Object.assign({}, it, { moved: true, next: mv.next, signed: mv.signed, status: mv.status, date: mv.date, conf: mv.conf, src: mv.src, tidTo: mv.tidTo });
  }
  var P = P0.map(mergeMove), CO = CO0.map(mergeMove);
  // LFT 행이 없는 이적 인물은 이적 행을 그대로 넣는다. 선수 이적은 선수 탭, 코치 이적은 코치 탭.
  var inP = new Set(P.map(function (x) { return x.pid; })), inCO = new Set(CO.map(function (x) { return x.pid; }));
  Object.keys(latest).forEach(function (pid) {
    var mv = latest[pid];
    if (T1.indexOf(mv) >= 0) {
      if (inP.has(pid)) return;
      // 이적 행에는 포지션·국적 칸이 없어 인물 정보로 채운다(선수 탭 표시·한국 탭 판정).
      var pp = own(PEOPLE, pid) || {};
      P.push(Object.assign({}, mv, { sub: [cleanName(pp.role), cleanName(pp.nationality)].filter(Boolean).join(", ") }));
    } else if (!inCO.has(pid)) CO.push(mv);
  });
  return { P: P, CO: CO };
}

// data/*.json 묶음 D 로 탭 목록을 만든다.
export function buildTabs(D, today) {
  var td = today == null ? TODAY : today;
  var PEOPLE = Object.create(null);
  (D.people || []).forEach(function (p) { PEOPLE[p.id] = p; });
  // 목록 행의 포지션(코치는 역할)·국적이 비었으면 인물 정보로 채운다. 행에 값이 있으면 행 값을 쓴다.
  function fillRow(r, kind, p) {
    var f = Object.assign({}, r);
    if (kind === "coach") f.role = cleanName(r.role) || cleanName(p.role);
    if (kind === "player") { f.position = cleanName(r.position) || cleanName(p.role); f.nationality = cleanName(r.nationality) || cleanName(p.nationality); }
    return f;
  }
  // 화면 항목에도 인물·팀 ID 를 붙여, 목록 행을 상세 링크로 만들 수 있게 한다.
  function items(rows, kind) {
    return rows.map(function (r) {
      var ids = idsOf(r, kind), p = own(PEOPLE, ids.pid);
      // 계약 만료: 행 값이 있으면 그것, 없으면 인물 정보. 목록 행에 "계약 ~…" 으로 보인다.
      var until = kind === "watch" ? undefined : contractOK(r.contractUntil) ? r.contractUntil : p && contractOK(p.contractUntil) ? p.contractUntil : undefined;
      return Object.assign(toItem(p && kind !== "t" && kind !== "watch" ? fillRow(r, kind, p) : r, kind, D.sources), ids, until === undefined ? {} : { contract: until });
    });
  }
  var P0 = items(D.players, "player"), CO0 = items(D.coaches, "coach"), W = items(D.watch, "watch");
  // 지켜볼 팀의 팀 링크는 teams 에 있는 ID 만 건다.
  var TS = new Set((D.teams || []).map(function (t) { return t.id; }));
  var TEAM_OBJ = Object.create(null);
  (D.teams || []).forEach(function (t) { TEAM_OBJ[t.id] = t; });
  // 선수 이적 행에는 포지션·국적 칸이 없어 인물 정보로 채운다(이적 탭 포지션 거르기·표시). mergeMoves 가 이 배열의 같은 객체를 찾으므로 먼저 바꾼다.
  var T1 = items(D.transfers.players, "t").map(function (it) { var pp = own(PEOPLE, it.pid) || {}; return Object.assign({}, it, { sub: [cleanName(pp.role), cleanName(pp.nationality)].filter(Boolean).join(", ") }); }), T2 = items(D.transfers.coaches, "t");
  var m = mergeMoves(P0, CO0, T1, T2, PEOPLE), P = m.P, CO = m.CO;
  // 한국 탭: 국적이 South Korea 이거나, 소속 팀(이적이면 도착 팀)의 국가가 South Korea 인 항목.
  function krTeam(it) { return isKorea(it.tid) || (!!it.moved && isKorea(it.tidTo)); }
  function isKorea(id) { var tm = own(TEAM_OBJ, id); return !!tm && tm.country === "South Korea"; }
  var PK = P.filter(function (it) { return /South Korea/.test(it.sub) || krTeam(it); });
  var CK = CO.filter(function (it) { var pp = own(PEOPLE, it.pid); return (!!pp && pp.nationality === "South Korea") || krTeam(it); });
  // 오늘 탭: 오늘(KST) 날짜의 인물 행(선수·코치 병합 목록, 인물당 한 줄). 오늘 것이 없으면 가장 최근 날짜의 행을 보이고 fallbackDate 로 알린다.
  var ALL = P.concat(CO), todayItems = ALL.filter(function (it) { return dayOf(it.date) === td; }), fallbackDate;
  if (!todayItems.length) {
    var latestDay = ALL.reduce(function (m, it) { return dayOf(it.date) > m ? dayOf(it.date) : m; }, -1);
    if (latestDay >= 0) { fallbackDate = latestDay; todayItems = ALL.filter(function (it) { return dayOf(it.date) === latestDay; }); }
  }
  var rosters = rosterCards(buildIndex(D), td);
  var TABS = [
    { id: "players", label: t("tab.players"), mode: "entry", status: true, size: P.length, groups: [{ items: P }] },
    { id: "today", label: t("tab.today"), mode: "entry", status: true, size: todayItems.length, hint: t("hint.today"), fallbackDate: fallbackDate, groups: [{ items: todayItems }] },
    { id: "coaches", label: t("tab.coaches"), mode: "entry", status: true, size: CO.length, groups: [{ items: CO }] },
    { id: "korea", label: t("tab.korea"), mode: "entry", status: true, size: PK.length + CK.length, hint: t("hint.korea"), groups: [{ title: t("group.players"), items: PK }, { title: t("group.coaches"), items: CK }] },
    { id: "transfers", label: t("tab.transfers"), mode: "entry", size: T1.length + T2.length, hint: t("hint.transfers"), groups: [{ title: t("group.players"), items: T1 }, { title: t("group.coaches"), items: T2 }] },
    { id: "roster", label: t("tab.roster"), mode: "roster", size: rosters.length, hint: t("hint.roster"), cards: rosters },
    { id: "watch", label: t("tab.watch"), mode: "watch", size: W.length, teams: TS, hint: t("hint.watch"), groups: [{ items: W }] },
    { id: "schedule", label: t("tab.schedule"), mode: "schedule", size: D.schedule.length },
    { id: "suggest", label: t("tab.suggest"), mode: "suggest" }
  ];
  // 팀 공통 배경은 탭 전체 항목으로 한 번 정한다. 필터나 검색에 따라 행 모양이 바뀌지 않게 하려고.
  TABS.forEach(function (tab) {
    if (tab.mode === "entry") {
      tab.shared = sharedTails([].concat.apply([], tab.groups.map(function (g) { return g.items; })));
      // 경로 줄이 도착 팀 링크를 정할 때 쓴다(IDX.teams 와 같은 모양).
      tab.teamObj = TEAM_OBJ;
    }
  });
  return TABS;
}

// 목록 거르기. 순수 함수: 오늘 날짜(today, 기본 TODAY)는 인자로 받는다.
// 포지션은 sub 의 첫 칸(포지션)에서 찾는다. 이적 탭은 인물 정보로 채운 포지션으로 거른다(선수 이적만). 코치 탭·지켜볼 팀은 포지션 칸이 없어 거르지 않는다.
// 팀 검색어: 소속 팀(이적이면 도착 팀)의 ID·이름·짧은 이름·별칭. 팀 ID 로 찾으므로 도착한 인물도 잡힌다.
function teamWords(tab, it) {
  return [it.tid, it.moved ? it.tidTo : ""].map(function (id) {
    var tm = id && tab.teamObj ? tab.teamObj[id] : null;
    return tm ? [tm.id, tm.name, tm.short].concat(tm.aliases || []).join(" ") : "";
  }).join(" ");
}

export function matches(it, tab, state, today) {
  var td = today == null ? TODAY : today;
  if (state.region !== "all" && it.region !== state.region) return false;
  if (tab.status && state.status !== "all" && cls(it) !== state.status) return false;
  if (state.q) {
    var hay = [it.name, it.team, it.sub, it.status, it.next, it.note, it.region, regionName(it.region), teamWords(tab, it)].join(" ").toLowerCase();
    if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
  }
  if (state.pos && state.pos !== "all" && tab.id !== "coaches" && tab.id !== "watch") {
    var head = String(it.sub || "").split(", ")[0].toLowerCase();
    if (head.indexOf(String(state.pos).toLowerCase()) < 0) return false;
  }
  if (state.days && state.days !== "all") {
    if (!(typeof it.date === "number" && td - it.date <= +state.days)) return false;
  }
  // VCT 파트너팀만: 소속 팀(이적이면 도착 팀)이 partner 이다. ascended 는 빠진다. 로스터 탭의 범위와는 따로 본다.
  if (state.top && tab.teamObj) {
    var top = [it.tid, it.tidTo].some(function (id) {
      var tm = id ? tab.teamObj[id] : null;
      return !!tm && tm.tier === "partner";
    });
    if (!top) return false;
  }
  return true;
}
