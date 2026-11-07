// 순수 함수만: 시트 행 → 화면용 항목, 상태 분류, 필터. DOM과 state를 직접 만지지 않는다.
import { TODAY, isoOf, stampOf } from "./format.js";
import { t, LANG } from "./i18n.js";

export var REGIONS = ["Americas", "EMEA", "Pacific", "China"];
// 지역·등급 이름은 쓰는 시점에 사전을 읽는다(setLang 뒤에도 맞게). 모르는 값은 "" 를 돌려준다.
export function regionName(r) { return REGIONS.indexOf(r) >= 0 ? t("region." + r) : ""; }
var TIERS = ["partner", "ascended", "challengers", "academy"];
export function tierName(tier) { return TIERS.indexOf(tier) >= 0 ? t("team." + tier) : ""; }

// 인물·팀 ID 형식. 주소(p/<id>/, t/<id>/)에 그대로 쓴다.
export var ID_RE = /^[a-z0-9-]+$/;

// 이름 → 임시 ID. 소문자, 악센트 제거, 영문·숫자 외는 하이픈. 남는 글자가 없으면(한자 이름 등) "x-" + 짧은 해시.
export function slugOf(s) {
  var raw = String(s == null ? "" : s).trim();
  var id = raw.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (id) return id;
  // FNV-1a 32비트
  var h = 2166136261;
  for (var i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return "x-" + h.toString(36);
}

// 날짜 비교용: 시트 일련번호가 아니면 가장 옛날(-1)로 본다.
function dayOf(d) { return typeof d === "number" ? d : -1; }

// 객체에서 자기 속성만 읽는다. 데이터 값이 constructor 같은 이름이어도 상속 속성을 돌려주지 않는다.
function own(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

export function toItem(r, kind, S) {
  if (kind === "player") return { region: r.region, team: r.team, name: r.name, sub: [r.position, r.nationality].filter(Boolean).join(", "), status: r.status, date: r.date, conf: r.conf, note: r.note, caption: r.caption, src: own(S, r.src) };
  if (kind === "coach") return { region: r.region, team: r.team, name: r.name, sub: r.role, status: r.status, date: r.date, conf: r.conf, note: r.note, caption: r.caption, src: own(S, r.src) };
  if (kind === "watch") return { region: r.region, team: r.team, name: r.targets, note: r.situation, src: own(S, r.src) };
  return { region: r.region, team: r.from, name: r.name, sub: "", status: r.type, next: r.to, moved: true, date: r.date, conf: r.conf, note: r.note, caption: r.caption, src: own(S, r.src), signed: r.signedDate };
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
  var T1 = items(D.transfers.players, "t"), T2 = items(D.transfers.coaches, "t");
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

// 행의 인물·팀 ID. 시트에 personId·teamId 등이 있으면 그것을, 없으면 이름에서 임시 ID(slugOf)를 만든다.
// 이적 행의 tid 는 이전 팀(tidFrom)이다. 목록의 팀 링크가 이전 팀을 가리키기 때문이다.
export function idsOf(r, kind) {
  // "-" 는 빈 칸이다(cleanName). 빈 칸에서 ID 를 만들면 없는 주소로 링크된다.
  function tidOf(id, name) { name = cleanName(name); return id || (name ? slugOf(name) : ""); }
  if (kind === "watch") {
    // 한 행에 팀이 여럿일 수 있다("FURIA / M80 / FlyQuest"). 빈 칸은 거른다.
    return { tids: [].concat(r.teamIds || String(r.team || "").split(" / ").map(cleanName).filter(Boolean).map(slugOf)) };
  }
  // 이름이 빈 행은 인물 ID 를 만들지 않는다(이름 링크도 없다).
  var name = cleanName(r.name);
  var o = { pid: r.personId || (name ? slugOf(name) : "") };
  if (kind === "t") {
    o.tidFrom = tidOf(r.fromTeam, r.from);
    o.tidTo = tidOf(r.toTeam, r.to);
    o.tid = o.tidFrom;
  } else {
    o.tid = tidOf(r.teamId, r.team);
  }
  return o;
}

// 나이: birth 가 "yyyy-mm-dd" 면 만 나이(approx false), "yyyy" 면 연도 차이(approx true, "약 N세"). 그 밖은 null.
// today 는 KST 날짜 일련번호(기본 TODAY). 시험할 때 날짜를 넣는다.
export function ageOf(birth, today) {
  var t = isoOf(today == null ? TODAY : today), s = String(birth == null ? "" : birth), ty = +t.slice(0, 4);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    var age = ty - +s.slice(0, 4);
    // 생일이 아직 안 지났으면 한 살 적다. "mm-dd" 문자열은 그대로 비교해도 날짜 순서와 같다.
    if (t.slice(5) < s.slice(5)) age--;
    return { age: age, approx: false };
  }
  if (/^\d{4}$/.test(s)) return { age: ty - +s, approx: true };
  return null;
}

// 계약 만료 상태. until 은 시트 일련번호. 만료 당일은 "오늘 만료", 하루라도 지났으면 "만료됨".
// 계약 만료 칸 값: 시트 일련번호(숫자) 또는 연도 "yyyy"(문자열). 그 밖은 없는 값이다.
export function contractOK(v) { return typeof v === "number" || (typeof v === "string" && /^\d{4}$/.test(v)); }

export function contractState(until, today) {
  if (typeof until === "string" && /^\d{4}$/.test(until)) {
    var y = +until, ty = +isoOf(today == null ? TODAY : today).slice(0, 4);
    if (y < ty) return { kind: "expired", label: t("contract.expired"), days: y - ty };
    return { kind: "year", label: t("contract.year", { y: until }), year: y };
  }
  if (typeof until !== "number") return { kind: "unknown", label: t("label.undisclosed") };
  var d = until - (today == null ? TODAY : today);
  if (d < 0) return { kind: "expired", label: t("contract.expired"), days: d };
  if (d === 0) return { kind: "today", label: t("contract.today"), days: 0 };
  return { kind: "active", label: t("contract.dday", { n: d }), days: d };
}

// 경력: from 최신순. current 는 to 가 없는(진행 중) 칸이다.
// 끝이 없고 시작이 오늘(KST, 달 단위) 이전이거나 같으면 current(진행 중), 아직 안 왔으면 upcoming(예정).
// 예정 칸은 팀 로스터에 들어가지 않는다. today 기본값은 TODAY.
export function careerOf(p, today) {
  var now = isoOf(today == null ? TODAY : today).slice(0, 7);
  return ((p && p.career) || []).slice().sort(function (a, b) {
    var x = a.from || "", y = b.from || "";
    return x < y ? 1 : x > y ? -1 : 0;
  }).map(function (c) {
    var open = !c.to, started = (c.from || "") <= now;
    return { team: c.team, from: c.from, to: c.to || null, role: c.role || "", current: open && started, upcoming: open && !started };
  });
}

// 보도일 최신순. 같은 날은 보도 시각이 확인된 소식을 먼저, 시각이 늦은 것부터. 항목은 item 을 가진 객체다.
export function newestFirst(a, b) {
  var da = typeof a.item.date === "number" ? a.item.date : -1, db = typeof b.item.date === "number" ? b.item.date : -1;
  if (da !== db) return db - da;
  var sa = stampOf(a.item), sb = stampOf(b.item);
  if (sa === null || sb === null) return (sa === null) - (sb === null);
  return sb - sa;
}

// 팀 이름: teams.json 에 있으면 그 이름, 없으면 소식 행의 팀 이름(이적은 이전 팀 쪽), 그래도 없으면 ID.
export function teamNameOf(id, list) {
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e.kind === "watch") continue;
    var n = e.kind === "t" ? (e.item.tidFrom === id ? e.item.team : e.item.next) : e.item.team;
    var c = cleanName(n);
    if (c) return c;
  }
  return id;
}


// 선수·코치 행이 이 팀으로 가는 계약인가("계약 완료(이 팀)"). 이적 행과 지켜볼 팀 행은 따로 본다.
function arrives(e, id, IDX) {
  if (e.kind === "t" || e.kind === "watch") return false;
  var r = routeOf(e.item, IDX.teams);
  return !!r && r.kind === "move" && r.toId === id;
}
function arrivalsOf(id, IDX) {
  var out = [];
  Object.keys(IDX.byPerson).forEach(function (pid) {
    IDX.byPerson[pid].forEach(function (e) { if (arrives(e, id, IDX)) out.push(e); });
  });
  return out;
}

// 팀 화면용: 현재 로스터, 들어온 인물, 나간 인물(이전 팀 이적 + 이 팀 소속 LFT·FA), 관련 소식(watch 포함).
// 로스터는 진행 중 경력 칸이 이 팀인 인물에서 (i) 이 팀에 대한 가장 최근 소식이 방출·결별·이탈이거나 이 팀에서 나간 이적인 인물,
// (ii) 팀이 운영 종료(active:false)면 전원을 뺀다. closed 는 (ii) 여부.
// 인물은 한 번만 넣는다(가장 최근 소식 기준). 반환 인물 목록은 같은 규칙으로 정렬한다.
export function teamMoves(id, IDX, today) {
  var news = (IDX.byTeam[id] || []).slice().sort(newestFirst), seenIn = new Set(), seenOut = new Set(), incoming = [], outgoing = [];
  // 다른 팀 소속 선수 행이 이 팀으로 가는 계약("계약 완료(이 팀)")도 들어온 인물에 넣으려고 함께 본다.
  var pool = news.concat(arrivalsOf(id, IDX)).sort(newestFirst);
  pool.forEach(function (e) {
    var pid = e.item.pid;
    if (e.kind === "watch" || !pid) return;
    if (((e.kind === "t" && e.item.tidTo === id) || arrives(e, id, IDX)) && !seenIn.has(pid)) { seenIn.add(pid); incoming.push(e); }
    if (((e.kind === "t" && e.item.tidFrom === id) || (e.kind !== "t" && e.item.tid === id)) && !seenOut.has(pid)) { seenOut.add(pid); outgoing.push(e); }
  });
  var team = own(IDX.teams, id), closed = !!team && team.active === false;
  // 같은 날 이적 행과 "계약 완료(새 팀)" 행이 함께 있으면 이적 행이 맨 앞이 아닐 수 있어, 가장 최근 날짜의 이적도 함께 본다.
  function gone(pid) {
    var mine = news.filter(function (x) { return x.kind !== "watch" && x.item.pid === pid; }), e = mine[0];
    if (!e) return false;
    if (e.kind !== "t" && /방출|결별|이탈/.test(e.item.status || "")) return true;
    return mine.some(function (x) { return x.kind === "t" && x.item.date === e.item.date && x.item.tidFrom === id && x.item.tidTo !== id; });
  }
  var roster = closed ? [] : Object.keys(IDX.people).map(function (k) { return IDX.people[k]; }).filter(function (p) {
    return careerOf(p, today).some(function (c) { return c.current && c.team === id; }) && !gone(p.id);
  }).sort(function (a, b) {
    var ca = a.kind === "coach" ? 1 : 0, cb = b.kind === "coach" ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return String(a.name || "") < String(b.name || "") ? -1 : 1;
  });
  return { roster: roster, incoming: incoming, outgoing: outgoing, news: news, closed: closed };
}

// 팀 소식(팀 화면): 이 팀의 지켜볼 팀 사건(철수·파트너십 탈락·계약 만료 예정·합류 보도)과,
// 로스터 인물 가운데 계약 만료가 90일 안이거나 이미 지난 인물, 그리고 연도만 있는 계약이 올해 이하인 인물.
// events 는 행 입력 순서를 그대로 둔다(지켜볼 팀 행에는 날짜가 없다). expiring 은 가까운 날짜순, 연도만 있는 것은 뒤에 둔다.
var NEWS_KINDS = ["withdraw", "dropped", "expiring", "joining"];
export function teamNews(id, IDX, today) {
  var td = today == null ? TODAY : today, thisYear = +isoOf(td).slice(0, 4);
  var events = (IDX.byTeam[id] || []).filter(function (e) {
    return e.kind === "watch" && NEWS_KINDS.indexOf(watchMeta(e.item.note).kind) >= 0;
  });
  var expiring = teamMoves(id, IDX, td).roster.filter(function (p) {
    var u = p.contractUntil;
    if (typeof u === "number") return u - td <= 90;
    return typeof u === "string" && /^\d{4}$/.test(u) && +u <= thisYear;
  }).map(function (p) { return { person: p, state: contractState(p.contractUntil, td) }; });
  expiring.sort(function (a, b) {
    var da = typeof a.person.contractUntil === "number", db = typeof b.person.contractUntil === "number";
    if (da !== db) return da ? -1 : 1;
    return da ? a.person.contractUntil - b.person.contractUntil : +a.person.contractUntil - +b.person.contractUntil;
  });
  return { events: events, expiring: expiring };
}

// 로스터 탭 카드: partner·ascended 팀마다 현재 로스터와 이번 비시즌 합류(+)·이탈(−) 인원.
// 지역 순(REGIONS), 같은 지역은 팀 이름 순. 로스터가 5명 미만이면 partial(정보 일부).
export function rosterCards(IDX, today) {
  var order = function (r) { var i = REGIONS.indexOf(r); return i < 0 ? REGIONS.length : i; };
  return Object.keys(IDX.teams).map(function (id) { return IDX.teams[id]; }).filter(function (tm) {
    return tm.tier === "partner" || tm.tier === "ascended";
  }).map(function (tm) {
    var m = teamMoves(tm.id, IDX, today);
    return { team: tm, roster: m.roster, inCount: m.incoming.length, outCount: m.outgoing.length, partial: m.roster.length < 5 };
  }).sort(function (a, b) {
    var d = order(a.team.region) - order(b.team.region);
    if (d) return d;
    var na = String(a.team.name || ""), nb = String(b.team.name || "");
    return na < nb ? -1 : na > nb ? 1 : 0;
  });
}

// 인물·팀별 소식 모음. 탭과 상관없이 한 사람·한 팀의 행을 모은다.
// 반환: { people: {id → 인물}, teams: {id → 팀}, byPerson: {id → [{kind, row, item}]}, byTeam: {id → [...]} }
// ID 가 없는 행은 이름으로 만든 임시 ID(slugOf)로 묶는다. item 은 toItem() 결과에 pid·tid(이적은 tidFrom·tidTo, watch 는 tids)만 붙인다.
export function buildIndex(D) {
  var IDX = { people: Object.create(null), teams: Object.create(null), byPerson: Object.create(null), byTeam: Object.create(null) };
  var S = D.sources || {}, T = D.transfers || {};
  (D.people || []).forEach(function (p) { IDX.people[p.id] = p; });
  (D.teams || []).forEach(function (t) { IDX.teams[t.id] = t; });
  function add(map, id, e) { if (map[id]) { if (map[id].indexOf(e) < 0) map[id].push(e); } else map[id] = [e]; }
  function each(rows, kind) {
    (rows || []).forEach(function (r) {
      var it = toItem(r, kind, S), e = { kind: kind, row: r, item: it }, ids = idsOf(r, kind);
      Object.assign(it, ids);
      if (kind !== "watch" && ids.pid) add(IDX.byPerson, ids.pid, e);
      var tids = kind === "watch" ? ids.tids : kind === "t" ? [ids.tidFrom, ids.tidTo] : [ids.tid];
      tids.forEach(function (id) { if (id) add(IDX.byTeam, id, e); });
    });
  }
  each(D.players, "player");
  each(D.coaches, "coach");
  each(T.players, "t");
  each(T.coaches, "t");
  each(D.watch, "watch");
  return IDX;
}

// 합류 단계. 이적 행은 공식 발표일(signedDate)이 있어야 확정이다. 그 밖의 합류는 단일 출처(R)이거나 구두 합의·임박 글이면 보도다.
var REPORTED_RE = /보도|구두|합의|임박/;
function joinStage(it) {
  if (it.moved && typeof it.signed === "number") return "confirmed";
  return it.conf === "R" || REPORTED_RE.test(it.status || "") ? "reported" : "confirmed";
}

// 상태를 세 가지 말로 줄인다: 구직 중, 새 팀 합류, 팀 떠남. 합류는 세 번째 값으로 단계("confirmed" 또는 "reported")를 준다.
// 한국어 상태 글을 읽는 정규식은 데이터 판정용이라 번역하지 않는다. 돌려주는 문구만 사전에서 찾는다.
export function pillOf(it) {
  // 짧은 문구(p[3])는 팀 이름을 경로 줄이 보여 줄 때 쓴다. 알약에는 단계만 말한다.
  var short = joinStage(it) === "reported" ? t("pill.reported") : t("pill.confirmed");
  if (it.moved) return /잔류/.test(it.status) ? ["signed", t("pill.stayed"), joinStage(it)] : ["signed", cleanName(it.next) ? t("pill.joined", { team: cleanName(it.next) }) : t("status.signed"), joinStage(it), short];
  var s = it.status;
  if (/계약 완료/.test(s)) {
    var m = s.match(/\((.+)\)/);
    if (!m) return ["signed", t("status.signed"), joinStage(it)];
    // 영문 화면에서는 "잔류" 알약을 사전 글로 쓴다(원문 "X 잔류" 는 한국어라 KR 칸으로 보내지 않는다). 한국어 화면은 원문 그대로.
    return /잔류/.test(m[1]) ? ["signed", LANG === "en" ? t("pill.stayed") : m[1], joinStage(it)] : ["signed", t("pill.joined", { team: m[1] }), joinStage(it), short];
  }
  // 팀을 떠났어도 새 팀을 찾는 중이면("팀 이탈 · 제한적 FA", "탐색 허가(팀 이탈)") 구직 중으로 본다.
  if (/구직|탐색|\b(FA|LFT)\b/i.test(s)) return ["open", t("status.open")];
  if (/방출/.test(s)) return ["left", t("pill.released")];
  if (/이탈|결별/.test(s)) return ["left", t("status.left")];
  // "BLG 합류 임박(보도)" 은 팀 이름을 읽어 보여 준다. 분류는 확인 필요 그대로 둬 "새 팀 합류" 개수가 바뀌지 않게 한다.
  var j = /^(.+?) 합류 임박/.exec(s);
  if (j) return ["unknown", t("pill.joinedReported", { team: j[1] })];
  return ["unknown", t("pill.unverified")];
}
export function cls(it) { return pillOf(it)[0]; }
// 화면과 설명문에 쓰는 상태 글. 합류 보도는 뒤에 "보도"를 붙여 "Sentinels 합류 보도" 로 보인다.
export function pillText(p) { return p[1] + (p[2] === "reported" ? t("pill.reportedMark") : ""); }

// 빈 칸과 "-" 는 이름이 없다.
// 빈 칸 판단은 이 함수 한 곳에서 한다. 앞뒤 공백을 떼고, 빈 글이나 "-" 이면 "" 를 돌려준다. val·validate 도 이것을 쓴다.
export function cleanName(v) { var s = v == null ? "" : String(v).trim(); return s === "-" ? "" : s; }
// 팀 ID: 시트에 있으면 그것, 없으면 이름에서 만든다. 이름이 없으면 ID 도 없다.
function toIdOf(name, id) { return id || (name ? slugOf(name) : ""); }
// 상태 글에서 경로 말고 남은 꾸밈말. 계약 완료(…), 이전 팀 이탈(…), "X 합류" 를 뗀다.
function noteOf(s, to) {
  return s.split(" · ").map(function (seg) {
    seg = seg.trim();
    if (/^계약 완료\(/.test(seg)) seg = seg.replace(/^계약 완료\([^)]*\)\s*/, "");
    else if (/이탈/.test(seg) && !/합류/.test(seg)) return "";
    // 데이터 판정용: 상태 글의 "X 합류" 자리. 번역하지 않는다.
    if (to) seg = seg.split(to + " 합류").join("");
    return seg.trim();
  }).filter(Boolean).join(" · ");
}

// 이동 경로 판정: 항목 하나에서 출발 팀과 도착 팀을 뽑는다. 이동이 아니면 null.
// kind 는 "move"(다른 팀) 또는 "stay"(잔류). stage 는 pillOf(it)[2] 와 같다.
// teams 는 팀 ID 인덱스(IDX.teams). 있는 ID 만 남기고, 없으면 링크 없이 글자만 쓴다.
export function routeOf(it, teams) {
  var T = teams || {}, s = String(it.status || "");
  function known(id) { return id && own(T, id) ? id : ""; }
  function out(kind, from, fromId, to, toId, note) {
    return { kind: kind, from: from, fromId: known(fromId), to: to, toId: known(toId), stage: pillOf(it)[2], note: note };
  }
  var from = cleanName(it.team), fromId = it.tid || "";
  if (it.moved) {
    var next = cleanName(it.next);
    if (/잔류/.test(s)) return out("stay", from, fromId, from, fromId, "");
    return next ? out("move", from, fromId, next, it.tidTo || toIdOf(next), "") : null;
  }
  var m = /계약 완료\(([^)]*)\)/.exec(s);
  if (m) {
    if (/잔류/.test(m[1])) {
      var x = cleanName(m[1].replace(/\s*잔류.*$/, "").trim());
      return x ? out("stay", x, toIdOf(x), x, toIdOf(x), "") : null;
    }
    var inner = cleanName(m[1].trim());
    return inner ? out("move", from, fromId, inner, toIdOf(inner), noteOf(s, inner)) : null;
  }
  // "BLG 합류 임박(보도)", "LOUD 이탈(본인 확인) · Leviatán 합류 보도": " 합류" 앞의 마지막 조각이 도착 팀.
  // 데이터 판정용: 한국어 상태 글의 " 합류" 자리. 번역하지 않는다.
  var j = s.indexOf(" 합류");
  if (j > 0) {
    var to = cleanName(s.slice(0, j).split(" · ").pop());
    if (to) return out("move", from, fromId, to, toIdOf(to), noteOf(s, to));
  }
  return null;
}

// 지켜볼 팀 상황 글의 종류. 위에서부터 처음 맞는 하나. 맞는 것이 없으면 종류 없음.
// 데이터 판정용 정규식(한국어 상태 글). 번역하지 않는다. 두 번째 칸은 사전 키다.
var WATCH_KINDS = [
  ["withdraw", "watch.withdraw", /철수|해체/],
  ["dropped", "watch.dropped", /파트너십 탈락/],
  ["expiring", "watch.expiring", /계약\s.*만료/],
  ["joining", "watch.joining", /합류.*(보도|합의)/]
];
// 상황 글 → 종류, 확정 여부(앞의 "[확정]"), 확인 날짜(끝의 "(확인 M/D)"), 둘을 뗀 본문.
export function watchMeta(text) {
  var s = String(text == null ? "" : text).trim(), confirmed = false, checked = "", m;
  if (/^\[확정\]/.test(s)) { confirmed = true; s = s.replace(/^\[확정\]\s*/, ""); }
  if ((m = /\s*\(확인\s*(\d{1,2}\/\d{1,2})\)\s*$/.exec(s))) { checked = m[1]; s = s.slice(0, m.index); }
  var k = WATCH_KINDS.filter(function (w) { return w[2].test(s); })[0];
  return { kind: k ? k[0] : "", label: k ? t(k[1]) : "", confirmed: confirmed, checked: checked, body: s };
}

// 메모는 " / " 로 이어 쓴 조각들이다. 빈 메모는 조각이 없다.
export function noteSegments(note) {
  var s = String(note == null ? "" : note);
  return s === "" ? [] : s.split(" / ");
}

// 팀 공통 배경(꼬리): 같은 팀에서 마지막 조각이 글자까지 같은 행이 2개 이상인 그 글. 팀마다 가장 많이 나온 하나를 고른다.
// 반환: Map(팀 이름 → 꼬리). 같은 개수면 먼저 나온 것.
export function sharedTails(items) {
  var counts = new Map();
  items.forEach(function (it) {
    var segs = noteSegments(it.note), tail = segs[segs.length - 1];
    if (!tail) return;
    var byTail = counts.get(it.team) || new Map();
    counts.set(it.team, byTail);
    byTail.set(tail, (byTail.get(tail) || 0) + 1);
  });
  var out = new Map();
  counts.forEach(function (byTail, team) {
    var best = null, bestN = 1;
    byTail.forEach(function (n, tail) { if (n > bestN) { best = tail; bestN = n; } });
    if (best !== null) out.set(team, best);
  });
  return out;
}

// 메모의 마지막 조각이 꼬리와 같은가.
export function hasTail(note, tail) {
  var segs = noteSegments(note);
  return !!tail && segs.length > 0 && segs[segs.length - 1] === tail;
}

// 메모에서 꼬리를 뺀 개인 부분. 꼬리가 없으면 메모 전체, 메모 전체가 꼬리면 "".
export function ownPart(note, tail) {
  return hasTail(note, tail) ? noteSegments(note).slice(0, -1).join(" / ") : String(note == null ? "" : note);
}

// 팀 공통 꼬리를 뺀 항목 복사본. 본문만 줄이고 보도 시각(_st)은 원래 메모 기준으로 남긴다. 꼬리가 없으면 그대로.
export function ownItem(it, shared) {
  var tail = shared.get(it.team);
  if (!hasTail(it.note, tail)) return it;
  return Object.assign({}, it, { note: ownPart(it.note, tail), _st: stampOf(it) });
}

// 목록 거르기. 순수 함수: 오늘 날짜(today, 기본 TODAY)는 인자로 받는다.
// 포지션은 sub 의 첫 칸(포지션)에서 찾는다. 코치 탭·지켜볼 팀·이적 탭은 포지션 칸이 없어 거르지 않는다.
export function matches(it, tab, state, today) {
  var td = today == null ? TODAY : today;
  if (state.region !== "all" && it.region !== state.region) return false;
  if (tab.status && state.status !== "all" && cls(it) !== state.status) return false;
  if (state.q) {
    var hay = [it.name, it.team, it.sub, it.status, it.next, it.note, it.region, regionName(it.region)].join(" ").toLowerCase();
    if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
  }
  if (state.pos && state.pos !== "all" && tab.id !== "coaches" && tab.id !== "watch" && tab.id !== "transfers") {
    var head = String(it.sub || "").split(", ")[0].toLowerCase();
    if (head.indexOf(String(state.pos).toLowerCase()) < 0) return false;
  }
  // 확인 단계: 알약의 단계(confirmed·reported)와 같아야 한다. 단계가 없는 항목은 "전체"가 아니면 빠진다.
  if (state.stage && state.stage !== "all" && pillOf(it)[2] !== state.stage) return false;
  if (state.days && state.days !== "all") {
    if (!(typeof it.date === "number" && td - it.date <= +state.days)) return false;
  }
  // 상위 팀만: 소속 팀(이적이면 도착 팀)이 partner 또는 ascended 이다.
  if (state.top && tab.teamObj) {
    var top = [it.tid, it.tidTo].some(function (id) {
      var tm = id ? tab.teamObj[id] : null;
      return !!tm && (tm.tier === "partner" || tm.tier === "ascended");
    });
    if (!top) return false;
  }
  return true;
}
