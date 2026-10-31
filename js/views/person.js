import { esc, relDate, stampOf, stampLabel, srcHTML } from "../format.js";
import { pillOf } from "../model.js";
import { pill } from "../components/pill.js";
import { badge } from "../components/badge.js";
import { listUrl } from "../state.js";

// 소식 줄 앞에 붙는 탭 이름. 이적 행은 선수·코치 구분 없이 "이적 완료" 탭에 모인다.
var TAB_NAME = { player: "선수", coach: "코치·스태프", t: "이적 완료" };

// 빈 칸과 "-" 는 보여 주지 않는다.
function val(v) { return v && v !== "-" ? v : ""; }

// 보도일 최신순. 같은 날은 보도 시각이 확인된 소식을 먼저, 시각이 늦은 것부터.
function newestFirst(a, b) {
  var da = typeof a.item.date === "number" ? a.item.date : -1, db = typeof b.item.date === "number" ? b.item.date : -1;
  if (da !== db) return db - da;
  var sa = stampOf(a.item), sb = stampOf(b.item);
  if (sa === null || sb === null) return (sa === null) - (sb === null);
  return sb - sa;
}

// "← 목록으로". 클릭은 main.js 가 맡는다(목록에서 왔으면 뒤로 가기).
export function backHTML() {
  return '<a class="back" href="' + esc(listUrl("players")) + '" data-back="1">← 목록으로</a>';
}

function newsRow(e) {
  var it = e.item;
  var when = relDate(it.date) + (stampLabel(it) ? " " + stampLabel(it) : "");
  var teamText = e.kind === "t" ? [val(it.team), val(it.next)].filter(Boolean).join(" → ") : val(it.team);
  var meta = [TAB_NAME[e.kind], teamText].filter(Boolean).map(esc).join(" · ");
  return '<li class="dp-row"><p class="dp-meta">' + when + (meta ? " · " + meta : "") + "</p>" +
    '<p class="dp-line">' + pill(pillOf(it)) + badge(it) + (val(it.note) ? " " + esc(it.note) : "") + srcHTML(it.src) + "</p></li>";
}

// 인물 상세 화면. 찾지 못하면 name 이 빈 문자열이다.
export function personHTML(id, IDX) {
  var list = (IDX.byPerson[id] || []).slice().sort(newestFirst), p = IDX.people[id];
  if (!list.length && !p) return { name: "", html: '<section class="detail-page">' + backHTML() + '<div class="empty">찾을 수 없는 선수입니다.</div></section>' };
  var name = val(p && p.name) || (list[0] ? list[0].row.name : "");
  // 국적·역할: people 값 우선, 없으면 최신순으로 처음 나오는 소식 행의 값.
  var nat = p ? val(p.nationality) : "", role = p ? val(p.role) : "";
  list.forEach(function (e) {
    if (!nat) nat = val(e.row.nationality);
    if (!role) role = val(e.row.role) || val(e.row.position);
  });
  var sub = [nat, role].filter(Boolean).join(" · ");
  var head = '<header class="dp-head"><h2 class="dp-name">' + esc(name) + "</h2>" +
    (sub ? '<p class="dp-sub">' + esc(sub) + "</p>" : "") +
    (list.length ? '<div class="dp-state">' + pill(pillOf(list[0].item)) + badge(list[0].item) + "</div>" : "") + "</header>";
  var notice = p ? "" : '<p class="dp-note">선수 정보는 정리 중입니다.</p>';
  var news = list.length ? '<ul class="dp-list">' + list.map(newsRow).join("") + "</ul>" : '<p class="dp-note">관련 소식이 없습니다.</p>';
  return {
    name: name,
    html: '<section class="detail-page">' + backHTML() + head + notice + '<div class="dp-sec"><h2>관련 소식</h2>' + news + "</div></section>"
  };
}
