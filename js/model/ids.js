// 인물·팀 ID, 이름 정리, 행을 화면 항목으로 바꾸기. 순수 함수. own·dayOf·toIdOf 는 이 폴더의 다른 파일이 쓴다.

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
export function dayOf(d) { return typeof d === "number" ? d : -1; }

// 객체에서 자기 속성만 읽는다. 데이터 값이 constructor 같은 이름이어도 상속 속성을 돌려주지 않는다.
export function own(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

export function toItem(r, kind, S) {
  if (kind === "player") return { region: r.region, team: r.team, name: r.name, sub: [r.position, r.nationality].filter(Boolean).join(", "), status: r.status, date: r.date, conf: r.conf, note: r.note, caption: r.caption, src: own(S, r.src) };
  if (kind === "coach") return { region: r.region, team: r.team, name: r.name, sub: r.role, status: r.status, date: r.date, conf: r.conf, note: r.note, caption: r.caption, src: own(S, r.src) };
  if (kind === "watch") return { region: r.region, team: r.team, name: r.targets, note: r.situation, src: own(S, r.src) };
  return { region: r.region, team: r.from, name: r.name, sub: "", status: r.type, next: r.to, moved: true, date: r.date, conf: r.conf, note: r.note, caption: r.caption, src: own(S, r.src), signed: r.signedDate };
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

// 빈 칸과 "-" 는 이름이 없다.
// 빈 칸 판단은 이 함수 한 곳에서 한다. 앞뒤 공백을 떼고, 빈 글이나 "-" 이면 "" 를 돌려준다. val·validate 도 이것을 쓴다.
export function cleanName(v) { var s = v == null ? "" : String(v).trim(); return s === "-" ? "" : s; }
// 팀 ID: 시트에 있으면 그것, 없으면 이름에서 만든다. 이름이 없으면 ID 도 없다.
export function toIdOf(name, id) { return id || (name ? slugOf(name) : ""); }
