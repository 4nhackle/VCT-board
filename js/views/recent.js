import { esc, fmtDate, dayWord, stampOf, dateLong } from "../format.js";
import { REGIONS, ownItem } from "../model.js";
import { state, teamUrl } from "../state.js";
import { rowHTML } from "../components/row.js";
import { t } from "../i18n.js";

// 최근 소식순: 보도 날짜별로 묶어 최신부터.
export function recentHTML(items, tab) {
  var days = [];
  items.forEach(function (it) { if (days.indexOf(it.date) < 0) days.push(it.date); });
  days.sort(function (a, b) { return (typeof b === "number" ? b : -1) - (typeof a === "number" ? a : -1); });
  return days.map(function (n) {
    var inDay = items.filter(function (it) { return it.date === n; });
    // 같은 날 안에서는 보도 시각이 확인된 소식을 먼저, 최신 시각순으로. 시각을 모르는 소식은 그 아래에 지역·팀 순.
    inDay.sort(function (a, b) {
      var sa = stampOf(a), sb = stampOf(b);
      if (sa !== null || sb !== null) {
        if (sa === null) return 1;
        if (sb === null) return -1;
        if (sa !== sb) return sb - sa;
      }
      return REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region) || a.team.toLowerCase().localeCompare(b.team.toLowerCase());
    });
    var head = t("date.unknown"), sub = "";
    if (typeof n === "number") {
      var d = new Date(Date.UTC(1899, 11, 30) + n * 864e5);
      var full = dateLong(d);
      var w = dayWord(n);
      if (w === fmtDate(n)) head = full; else { head = w; sub = full; }
    }
    return '<div class="rh"><h2>' + head + '</h2><span class="en">' + sub + '</span><span class="n">' + t("count.cases", { n: inDay.length }) + "</span></div>" +
      '<ul class="list">' + inDay.map(function (it) {
        // 팀이 섞여 있으므로 팀 공통 배경은 행에서 빼고, 팀 상세로 가는 작은 링크만 둔다.
        var o = ownItem(it, tab.shared), moved = o !== it && it.tid;
        return rowHTML(o, tab, { region: state.region === "all", more: moved ? '<p class="detail"><a class="tlink" href="' + esc(teamUrl(it.tid)) + '">' + t("link.teamShared") + "</a></p>" : "" });
      }).join("") + "</ul>";
  }).join("");
}
