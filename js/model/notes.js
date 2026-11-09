// 메모 조각과 팀 공통 꼬리 나누기(화면 나눔, 데이터는 그대로).
import { stampOf } from "../format.js";

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
