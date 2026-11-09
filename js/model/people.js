// 인물 나이·계약·경력, 이적으로 본 팀 로스터, 팀 소식, 로스터 카드, 인물·팀별 색인.
import { TODAY, isoOf, stampOf } from "../format.js";
import { t } from "../i18n.js";
import { REGIONS } from "./labels.js";
import { dayOf, own, toItem, idsOf, cleanName } from "./ids.js";
import { routeOf, watchMeta } from "./status.js";

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

// 인물의 가장 최근 이적 행(없으면 null). 날짜 최신순, 같은 날은 발표일(signed)이 있는 행. mergeMoves 와 같은 기준.
function latestMove(pid, IDX) {
  var best = null;
  (own(IDX.byPerson, pid) || []).forEach(function (e) {
    if (e.kind !== "t") return;
    var d = dayOf(e.item.date), bd = best ? dayOf(best.item.date) : -2;
    if (!best || d > bd || (d === bd && typeof e.item.signed === "number" && typeof best.item.signed !== "number")) best = e;
  });
  return best;
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
  // 현재 소속: 이적 행이 있으면 가장 최근 이적의 도착 팀(잔류는 옛 팀, 도착 팀이 비면 소속 없음), 없으면 경력 칸.
  // shortcut: latest transfer beats people.json career; if career gets a newer move that is missing from transfers, career should win — compare dates then.
  function onTeam(p) {
    var mv = latestMove(p.id, IDX);
    if (mv) return mv.item.tidTo === id;
    return careerOf(p, today).some(function (c) { return c.current && c.team === id; });
  }
  var roster = closed ? [] : Object.keys(IDX.people).map(function (k) { return IDX.people[k]; }).filter(function (p) {
    return onTeam(p) && !gone(p.id);
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
