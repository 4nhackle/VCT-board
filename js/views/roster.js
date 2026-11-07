import { esc, textHTML } from "../format.js";
import { personUrl, teamUrl } from "../state.js";
import { cleanName } from "../model.js";
import { t } from "../i18n.js";

// 로스터 탭: 지역 거르기(state.region)만 적용한다. 팀마다 카드 하나, 팀 링크, 인원 +·−, 선수 다음 코치.
export function rosterHTML(cards, state) {
  var shown = cards.filter(function (c) { return state.region === "all" || c.team.region === state.region; });
  if (!shown.length) return '<div class="empty">' + t("msg.empty") + "</div>";
  return shown.map(function (c) {
    var tm = c.team, people = "";
    if (c.roster.length) {
      people = '<ul class="dp-people">' + c.roster.map(function (p) {
        var role = cleanName(p.role) || t(p.kind === "coach" ? "team.coaches" : "team.players");
        return '<li><a href="' + esc(personUrl(p.id)) + '">' + textHTML(p.name || p.id) + '</a> <span class="dp-facts-inline">' + esc(role) + "</span></li>";
      }).join("") + "</ul>";
    } else {
      people = '<p class="dp-note">' + t(tm.active === false ? "msg.teamClosed" : "msg.rosterPending") + "</p>";
    }
    return '<section class="dp-sec"><h2><a href="' + esc(teamUrl(tm.id)) + '">' + textHTML(tm.name || tm.id) + "</a></h2>" +
      '<p class="dp-facts-inline">' + esc(t("roster.inout", { i: c.inCount, o: c.outCount })) + "</p>" +
      (c.partial ? '<p class="dp-note">' + t("roster.partial") + "</p>" : "") + people + "</section>";
  }).join("");
}
