import { esc, relDate, srcHTML, stampLabel } from "../format.js";
import { REGION_KO, TIER_KO, pillOf, teamMoves, teamNameOf, newestFirst } from "../model.js";
import { pill } from "../components/pill.js";
import { badge } from "../components/badge.js";
import { personUrl } from "../state.js";
import { backHTML } from "./person.js";

var TAB_NAME = { player: "선수", coach: "코치·스태프", t: "이적 완료", watch: "지켜볼 팀" };

// 빈 칸과 "-" 는 보여 주지 않는다.
function val(v) { return v && v !== "-" ? v : ""; }

// 인물 이름. pid 가 없으면 링크 없이 글자만 둔다.
function nameLink(pid, text) {
  return pid ? '<a href="' + esc(personUrl(pid)) + '">' + esc(text) + "</a>" : esc(text);
}

// 들어온·나간 인물 한 줄: 이름, 날짜, 이동 경로(이적) 또는 소속 팀·상태(LFT·FA).
function movesLi(e) {
  var it = e.item, route = e.kind === "t" ? [val(it.team), val(it.next)].filter(Boolean).join(" → ") : [val(it.team), val(it.status)].filter(Boolean).join(" · ");
  return '<li>' + nameLink(it.pid, it.name) + ' <span class="dp-facts-inline">' + relDate(it.date) + (route ? " · " + esc(route) : "") + "</span></li>";
}

// 관련 소식 한 줄. 지켜볼 팀(watch)은 대상과 메모를 보여 준다.
function newsRow(e) {
  var it = e.item, when = relDate(it.date) + (stampLabel(it) ? " " + stampLabel(it) : "");
  if (e.kind === "watch") {
    return '<li class="dp-row"><p class="dp-meta">' + [when, esc(TAB_NAME.watch), esc(it.team)].filter(Boolean).join(" · ") + '</p><p class="dp-line">대상: ' + esc(it.name) +
      (val(it.note) ? ". " + esc(it.note) : "") + srcHTML(it.src) + "</p></li>";
  }
  var route = e.kind === "t" ? [val(it.team), val(it.next)].filter(Boolean).join(" → ") : val(it.team);
  return '<li class="dp-row"><p class="dp-meta">' + [when, esc(TAB_NAME[e.kind]), esc(route)].filter(Boolean).join(" · ") + "</p>" +
    '<p class="dp-line">' + pill(pillOf(it)) + badge(it) + " " + nameLink(it.pid, it.name) + (val(it.note) ? " " + esc(it.note) : "") + srcHTML(it.src) + "</p></li>";
}

// 팀 상세 화면. 찾지 못하면 name 이 빈 문자열이다.
export function teamHTML(id, IDX) {
  var t = IDX.teams[id], list = (IDX.byTeam[id] || []).slice().sort(newestFirst);
  if (!t && !list.length) return { name: "", html: '<section class="detail-page">' + backHTML() + '<div class="empty">찾을 수 없는 팀입니다.</div></section>' };
  var name = t && val(t.name) ? t.name : teamNameOf(id, list);
  var m = teamMoves(id, IDX);
  var sub = t ? [val(t.short), REGION_KO[t.region] || val(t.region), val(t.country), TIER_KO[t.tier] || ""].filter(Boolean).join(" · ") : "";
  var head = '<header class="dp-head"><h2 class="dp-name">' + esc(name) + "</h2>" +
    (sub ? '<p class="dp-sub">' + esc(sub) + "</p>" : "") +
    (t && t.active === false ? '<div class="dp-state"><span class="dp-off">운영 종료</span></div>' : "") +
    (t && val(t.note) ? '<p class="dp-note">' + esc(t.note) + "</p>" : "") + "</header>";

  var roster = m.roster.length
    ? '<ul class="dp-people">' + m.roster.map(function (p) {
      return '<li><a href="' + esc(personUrl(p.id)) + '">' + esc(val(p.name) || p.id) + '</a> <span class="dp-facts-inline">' + (p.kind === "coach" ? "코치" : "선수") + "</span></li>";
    }).join("") + "</ul>"
    : '<p class="dp-note">로스터 정보는 정리 중입니다.</p>';
  var sections = '<div class="dp-sec"><h2>현재 로스터</h2>' + roster + "</div>";
  if (m.incoming.length) sections += '<div class="dp-sec"><h2>들어온 인물</h2><ul class="dp-people">' + m.incoming.map(movesLi).join("") + "</ul></div>";
  if (m.outgoing.length) sections += '<div class="dp-sec"><h2>나간 인물</h2><ul class="dp-people">' + m.outgoing.map(movesLi).join("") + "</ul></div>";
  var news = m.news.length ? '<ul class="dp-list">' + m.news.map(newsRow).join("") + "</ul>" : '<p class="dp-note">관련 소식이 없습니다.</p>';
  sections += '<div class="dp-sec"><h2>관련 소식</h2>' + news + "</div>";

  return { name: name, html: '<section class="detail-page">' + backHTML() + head + sections + "</section>" };
}
