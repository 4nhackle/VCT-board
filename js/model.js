// 순수 함수만: 시트 행 → 화면용 항목, 상태 분류, 필터. DOM과 state를 직접 만지지 않는다.
import { TODAY, isoOf, stampOf } from "./format.js";

export var REGIONS = ["Americas", "EMEA", "Pacific", "China"];
export var REGION_KO = { Americas: "아메리카", EMEA: "유럽·중동·아프리카", Pacific: "아시아태평양", China: "중국" };
var KR_TEAMS = /^(T1|KIWOOM DRX|Nongshim RedForce|Gen\.G|DRX)$/i;

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

export function toItem(r, kind, S) {
  if (kind === "player") return { region: r.region, team: r.team, name: r.name, sub: [r.position, r.nationality].filter(Boolean).join(", "), status: r.status, date: r.date, conf: r.conf, note: r.note, src: S[r.src] };
  if (kind === "coach") return { region: r.region, team: r.team, name: r.name, sub: r.role, status: r.status, date: r.date, conf: r.conf, note: r.note, src: S[r.src] };
  if (kind === "watch") return { region: r.region, team: r.team, name: r.targets, note: r.situation, src: S[r.src] };
  return { region: r.region, team: r.from, name: r.name, sub: "", status: r.type, next: r.to, moved: true, date: r.date, conf: r.conf, note: r.note, src: S[r.src] };
}

// data/*.json 묶음 D 로 탭 목록을 만든다.
export function buildTabs(D) {
  // 화면 항목에도 인물·팀 ID 를 붙여, 목록 행을 상세 링크로 만들 수 있게 한다.
  function items(rows, kind) { return rows.map(function (r) { return Object.assign(toItem(r, kind, D.sources), idsOf(r, kind)); }); }
  var P = items(D.players, "player"), CO = items(D.coaches, "coach"), W = items(D.watch, "watch");
  var T1 = items(D.transfers.players, "t"), T2 = items(D.transfers.coaches, "t");
  var PK = P.filter(function (it) { return /South Korea/.test(it.sub); });
  var CK = CO.filter(function (it) { return KR_TEAMS.test(it.team); });
  return [
    { id: "players", label: "선수", mode: "entry", status: true, size: P.length, groups: [{ items: P }] },
    { id: "coaches", label: "코치·스태프", mode: "entry", status: true, size: CO.length, groups: [{ items: CO }] },
    { id: "korea", label: "한국", mode: "entry", status: true, size: PK.length + CK.length, hint: "국적이 South Korea인 선수와 한국 팀(T1, KIWOOM DRX, Nongshim RedForce) 소속 코치·스태프입니다.", groups: [{ title: "선수", items: PK }, { title: "코치·스태프", items: CK }] },
    { id: "transfers", label: "이적 완료", mode: "entry", size: T1.length + T2.length, hint: "이전 소속 팀 기준으로 묶었습니다.", groups: [{ title: "선수", items: T1 }, { title: "코치·스태프", items: T2 }] },
    { id: "watch", label: "지켜볼 팀", mode: "watch", size: W.length, hint: "계약 만료나 존속 여부가 정해지지 않은 팀입니다.", groups: [{ items: W }] },
    { id: "schedule", label: "일정", mode: "schedule", size: D.schedule.length },
    { id: "suggest", label: "건의", mode: "suggest" }
  ];
}

// 행의 인물·팀 ID. 시트에 personId·teamId 등이 있으면 그것을, 없으면 이름에서 임시 ID(slugOf)를 만든다.
// 이적 행의 tid 는 이전 팀(tidFrom)이다. 목록의 팀 링크가 이전 팀을 가리키기 때문이다.
export function idsOf(r, kind) {
  function tidOf(id, name) { return id || (name ? slugOf(name) : ""); }
  if (kind === "watch") {
    // 한 행에 팀이 여럿일 수 있다("FURIA / M80 / FlyQuest").
    return { tids: r.teamIds || String(r.team || "").split(" / ").filter(Boolean).map(slugOf) };
  }
  // 이름이 빈 행은 인물 ID 를 만들지 않는다(이름 링크도 없다).
  var o = { pid: r.personId || (r.name ? slugOf(r.name) : "") };
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
export function contractState(until, today) {
  if (typeof until !== "number") return { kind: "unknown", label: "미공개" };
  var d = until - (today == null ? TODAY : today);
  if (d < 0) return { kind: "expired", label: "만료됨", days: d };
  if (d === 0) return { kind: "today", label: "오늘 만료", days: 0 };
  return { kind: "active", label: "D-" + d, days: d };
}

// 경력: from 최신순. current 는 to 가 없는(진행 중) 칸이다.
export function careerOf(p) {
  return ((p && p.career) || []).slice().sort(function (a, b) {
    var x = a.from || "", y = b.from || "";
    return x < y ? 1 : x > y ? -1 : 0;
  }).map(function (c) {
    return { team: c.team, from: c.from, to: c.to || null, role: c.role || "", current: !c.to };
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
    if (n && n !== "-") return n;
  }
  return id;
}

export var TIER_KO = { partner: "파트너 팀", ascended: "어센션 팀", challengers: "챌린저스", academy: "아카데미" };

// 팀 화면용: 현재 로스터(진행 중 경력 칸이 이 팀인 인물), 들어온 인물, 나간 인물(이전 팀 이적 + 이 팀 소속 LFT·FA), 관련 소식(watch 포함).
// 인물은 한 번만 넣는다(가장 최근 소식 기준). 반환 인물 목록은 같은 규칙으로 정렬한다.
export function teamMoves(id, IDX) {
  var news = (IDX.byTeam[id] || []).slice().sort(newestFirst), seenIn = {}, seenOut = {}, incoming = [], outgoing = [];
  news.forEach(function (e) {
    var pid = e.item.pid;
    if (e.kind === "watch" || !pid) return;
    if (e.kind === "t" && e.item.tidTo === id && !seenIn[pid]) { seenIn[pid] = true; incoming.push(e); }
    if (((e.kind === "t" && e.item.tidFrom === id) || (e.kind !== "t" && e.item.tid === id)) && !seenOut[pid]) { seenOut[pid] = true; outgoing.push(e); }
  });
  var roster = Object.keys(IDX.people).map(function (k) { return IDX.people[k]; }).filter(function (p) {
    return careerOf(p).some(function (c) { return c.current && c.team === id; });
  }).sort(function (a, b) {
    var ca = a.kind === "coach" ? 1 : 0, cb = b.kind === "coach" ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return String(a.name || "") < String(b.name || "") ? -1 : 1;
  });
  return { roster: roster, incoming: incoming, outgoing: outgoing, news: news };
}

// 인물·팀별 소식 모음. 탭과 상관없이 한 사람·한 팀의 행을 모은다.
// 반환: { people: {id → 인물}, teams: {id → 팀}, byPerson: {id → [{kind, row, item}]}, byTeam: {id → [...]} }
// ID 가 없는 행은 이름으로 만든 임시 ID(slugOf)로 묶는다. item 은 toItem() 결과에 pid·tid(이적은 tidFrom·tidTo, watch 는 tids)만 붙인다.
export function buildIndex(D) {
  var IDX = { people: {}, teams: {}, byPerson: {}, byTeam: {} };
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

// 상태를 세 가지 말로 줄인다: 구직 중, 새 팀 합류, 팀 떠남.
export function pillOf(it) {
  if (it.moved) return ["signed", /잔류/.test(it.status) ? "잔류" : it.next + " 합류"];
  var s = it.status;
  if (/계약 완료/.test(s)) {
    var m = s.match(/\((.+)\)/);
    return ["signed", m ? (/잔류/.test(m[1]) ? m[1] : m[1] + " 합류") : "새 팀 합류"];
  }
  // 팀을 떠났어도 새 팀을 찾는 중이면("팀 이탈 · 제한적 FA", "탐색 허가(팀 이탈)") 구직 중으로 본다.
  if (/구직|탐색|\b(FA|LFT)\b/i.test(s)) return ["open", "구직 중"];
  if (/방출/.test(s)) return ["left", "방출"];
  if (/이탈|결별/.test(s)) return ["left", "팀 떠남"];
  return ["unknown", "확인 필요"];
}
export function cls(it) { return pillOf(it)[0]; }

export function matches(it, tab, state) {
  if (state.region !== "all" && it.region !== state.region) return false;
  if (tab.status && state.status !== "all" && cls(it) !== state.status) return false;
  if (state.q) {
    var hay = [it.name, it.team, it.sub, it.status, it.next, it.note, it.region, REGION_KO[it.region] || ""].join(" ").toLowerCase();
    if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
  }
  return true;
}
