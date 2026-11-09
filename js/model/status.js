// 상태 알약, 이동 경로, 지켜볼 팀 상황 종류. 한국어 상태 글을 읽는 판정은 데이터용이라 번역하지 않는다.
import { t, LANG } from "../i18n.js";
import { own, cleanName, toIdOf } from "./ids.js";

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
