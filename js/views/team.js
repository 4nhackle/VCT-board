import { esc, textHTML } from "../format.js";
import { personUrl } from "../state.js";
import { regionName, tierName, teamMoves, teamNameOf, teamNews, newestFirst } from "../model.js";
import { rowHTML } from "../components/row.js";
import { backHTML } from "./person.js";
import { val, newsRow, infoHTML, monoHTML, nameHTML } from "./common.js";
import { t } from "../i18n.js";

// 팀 상세 화면. 찾지 못하면 name 이 빈 문자열이다.
export function teamHTML(id, IDX) {
  var team = IDX.teams[id], list = (IDX.byTeam[id] || []).slice().sort(newestFirst);
  if (!team && !list.length) return { name: "", html: '<section class="detail-page">' + backHTML() + '<div class="empty">' + t("msg.notfoundTeam") + "</div></section>" };
  var name = team && val(team.name) ? team.name : teamNameOf(id, list);
  var m = teamMoves(id, IDX);
  var head = '<header class="dp-head">' + monoHTML(val(team && team.short) || name) + '<h1 class="dp-name">' + textHTML(name) +
    "</h1>" + (team && val(team.short) && team.short !== name ? '<p class="dp-real">' + textHTML(team.short) + "</p>" : "") +
    (m.closed ? '<div class="dp-state"><span class="dp-off">' + t("team.closed") + "</span></div>" : "") +
    (team && val(team.note) ? '<p class="dp-note">' + textHTML(team.note) + "</p>" : "") + "</header>";
  var info = infoHTML([
    [t("team.region"), esc(team ? regionName(team.region) || val(team.region) : "")],
    [t("team.country"), esc(team ? val(team.country) : "")],
    [t("team.tier"), esc(team ? tierName(team.tier) || "" : "")],
    [t("team.status"), team ? (m.closed ? t("team.closed") : t("team.open")) : ""]
  ]);

  var roster = m.closed ? '<p class="dp-box">' + t("msg.teamClosed") + "</p>" : m.roster.length
    ? '<ul class="dp-people">' + m.roster.map(function (p) {
      return '<li><a href="' + esc(personUrl(p.id)) + '">' + nameHTML(val(p.name) || p.id) + '</a> <span class="dp-facts-inline">' + (p.kind === "coach" ? t("team.coaches") : t("team.players")) + "</span></li>";
    }).join("") + "</ul>"
    : '<p class="dp-note">' + t("msg.rosterPending") + "</p>";
  var sections = '<div class="dp-sec"><h2>' + t("h.roster") + "</h2>" + roster + "</div>";
  // 같은 사건은 한 번만: 들어온·나간 인물은 소식 전체(본문·출처)로 보여 주고, 관련 소식에서는 그 줄을 뺀다.
  function rows(list) { return '<ul class="dp-list">' + list.map(function (e) { return newsRow(e, true); }).join("") + "</ul>"; }
  if (m.incoming.length) sections += '<div class="dp-sec"><h2>' + t("h.incoming") + "</h2>" + rows(m.incoming) + "</div>";
  if (m.outgoing.length) sections += '<div class="dp-sec"><h2>' + t("h.outgoing") + "</h2>" + rows(m.outgoing) + "</div>";
  // 팀 소식: 지켜볼 팀 사건과 계약 만료 임박 인물. 둘 다 없으면 구역을 넣지 않는다.
  var tnews = teamNews(id, IDX), watchTeams = new Set(Object.keys(IDX.teams));
  if (tnews.events.length || tnews.expiring.length) {
    var evs = tnews.events.length ? '<ul class="dp-list">' + tnews.events.map(function (e) { return rowHTML(e.item, { mode: "watch", teams: watchTeams }); }).join("") + "</ul>" : "";
    var exp = tnews.expiring.length ? '<p class="dp-note">' + t("team.expiring") + '</p><ul class="dp-people">' + tnews.expiring.map(function (x) {
      return '<li><a href="' + esc(personUrl(x.person.id)) + '">' + nameHTML(val(x.person.name) || x.person.id) + '</a> <span class="dp-facts-inline">' + esc(x.state.label) + "</span></li>";
    }).join("") + "</ul>" : "";
    sections += '<div class="dp-sec"><h2>' + t("team.news") + "</h2>" + evs + exp + "</div>";
  }
  var shown = new Set(m.incoming.concat(m.outgoing)), rest = m.news.filter(function (e) { return !shown.has(e); });
  if (rest.length) sections += '<div class="dp-sec"><h2>' + t("h.news") + "</h2>" + rows(rest) + "</div>";
  else if (!shown.size) sections += '<div class="dp-sec"><h2>' + t("h.news") + '</h2><p class="dp-note">' + t("msg.noNews") + "</p></div>";

  return { name: name, html: '<section class="detail-page">' + backHTML() + head + info + sections + "</section>" };
}
