// 순수 함수만: 시트 행 → 화면용 항목, 상태 분류, 필터. DOM과 state를 직접 만지지 않는다.
export var REGIONS = ["Americas", "EMEA", "Pacific", "China"];
export var REGION_KO = { Americas: "아메리카", EMEA: "유럽·중동·아프리카", Pacific: "아시아태평양", China: "중국" };
var KR_TEAMS = /^(T1|KIWOOM DRX|Nongshim RedForce|Gen\.G|DRX)$/i;

// 인물·팀 ID 형식. 주소(p/<id>/, t/<id>/)에 그대로 쓴다.
export var ID_RE = /^[a-z0-9-]+$/;

// 이름 → 임시 ID. 소문자, 악센트 제거, 영문·숫자 외는 하이픈. 남는 글자가 없으면(한자 이름 등) "x-" + 짧은 해시.
export function slugOf(s) {
  var raw = String(s == null ? "" : s).trim();
  var id = raw.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
  function items(rows, kind) { return rows.map(function (r) { return toItem(r, kind, D.sources); }); }
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

// 인물·팀별 소식 모음. 탭과 상관없이 한 사람·한 팀의 행을 모은다.
// 반환: { people: {id → 인물}, teams: {id → 팀}, byPerson: {id → [{kind, row, item}]}, byTeam: {id → [...]} }
// ID 가 없는 행은 이름으로 만든 임시 ID(slugOf)로 묶는다. item 은 toItem() 결과에 pid·tid(이적은 tidFrom·tidTo, watch 는 tids)만 붙인다.
export function buildIndex(D) {
  var IDX = { people: {}, teams: {}, byPerson: {}, byTeam: {} };
  var S = D.sources || {}, T = D.transfers || {};
  (D.people || []).forEach(function (p) { IDX.people[p.id] = p; });
  (D.teams || []).forEach(function (t) { IDX.teams[t.id] = t; });
  function add(map, id, e) { if (map[id]) { if (map[id].indexOf(e) < 0) map[id].push(e); } else map[id] = [e]; }
  function tidOf(id, name) { return id || (name ? slugOf(name) : ""); }
  function each(rows, kind) {
    (rows || []).forEach(function (r) {
      var it = toItem(r, kind, S), e = { kind: kind, row: r, item: it }, tids;
      if (kind === "watch") {
        // 한 행에 팀이 여럿일 수 있다("FURIA / M80 / FlyQuest").
        it.tids = r.teamIds || String(r.team || "").split(" / ").filter(Boolean).map(slugOf);
        tids = it.tids;
      } else {
        it.pid = r.personId || slugOf(r.name);
        add(IDX.byPerson, it.pid, e);
        if (kind === "t") {
          it.tidFrom = tidOf(r.fromTeam, r.from);
          it.tidTo = tidOf(r.toTeam, r.to);
          tids = [it.tidFrom, it.tidTo];
        } else {
          it.tid = tidOf(r.teamId, r.team);
          tids = [it.tid];
        }
      }
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
