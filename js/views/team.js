import { esc } from "../format.js";
import { personUrl } from "../state.js";
import { REGION_KO, TIER_KO, teamMoves, teamNameOf, newestFirst } from "../model.js";
import { backHTML } from "./person.js";
import { val, newsRow, infoHTML, monoHTML } from "./common.js";

// 팀 상세 화면. 찾지 못하면 name 이 빈 문자열이다.
export function teamHTML(id, IDX) {
  var t = IDX.teams[id], list = (IDX.byTeam[id] || []).slice().sort(newestFirst);
  if (!t && !list.length) return { name: "", html: '<section class="detail-page">' + backHTML() + '<div class="empty">찾을 수 없는 팀입니다.</div></section>' };
  var name = t && val(t.name) ? t.name : teamNameOf(id, list);
  var m = teamMoves(id, IDX);
  var head = '<header class="dp-head">' + monoHTML(val(t && t.short) || name) + '<h1 class="dp-name">' + esc(name) +
    "</h1>" + (t && val(t.short) && t.short !== name ? '<p class="dp-real">' + esc(t.short) + "</p>" : "") +
    (m.closed ? '<div class="dp-state"><span class="dp-off">운영 종료</span></div>' : "") +
    (t && val(t.note) ? '<p class="dp-note">' + esc(t.note) + "</p>" : "") + "</header>";
  var info = infoHTML([
    ["지역", esc(t ? REGION_KO[t.region] || val(t.region) : "")],
    ["국가", esc(t ? val(t.country) : "")],
    ["등급", esc(t ? TIER_KO[t.tier] || "" : "")],
    ["상태", t ? (m.closed ? "운영 종료" : "운영 중") : ""]
  ]);

  var roster = m.closed ? '<p class="dp-box">운영을 종료한 팀입니다. 현재 로스터가 없습니다.</p>' : m.roster.length
    ? '<ul class="dp-people">' + m.roster.map(function (p) {
      return '<li><a href="' + esc(personUrl(p.id)) + '">' + esc(val(p.name) || p.id) + '</a> <span class="dp-facts-inline">' + (p.kind === "coach" ? "코치" : "선수") + "</span></li>";
    }).join("") + "</ul>"
    : '<p class="dp-note">로스터 정보는 정리 중입니다.</p>';
  var sections = '<div class="dp-sec"><h2>현재 로스터</h2>' + roster + "</div>";
  // 같은 사건은 한 번만: 들어온·나간 인물은 소식 전체(본문·출처)로 보여 주고, 관련 소식에서는 그 줄을 뺀다.
  function rows(list) { return '<ul class="dp-list">' + list.map(function (e) { return newsRow(e, true); }).join("") + "</ul>"; }
  if (m.incoming.length) sections += '<div class="dp-sec"><h2>들어온 인물</h2>' + rows(m.incoming) + "</div>";
  if (m.outgoing.length) sections += '<div class="dp-sec"><h2>나간 인물</h2>' + rows(m.outgoing) + "</div>";
  var shown = new Set(m.incoming.concat(m.outgoing)), rest = m.news.filter(function (e) { return !shown.has(e); });
  if (rest.length) sections += '<div class="dp-sec"><h2>관련 소식</h2>' + rows(rest) + "</div>";
  else if (!shown.size) sections += '<div class="dp-sec"><h2>관련 소식</h2><p class="dp-note">관련 소식이 없습니다.</p></div>';

  return { name: name, html: '<section class="detail-page">' + backHTML() + head + info + sections + "</section>" };
}
