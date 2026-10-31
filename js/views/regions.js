import { esc } from "../format.js";
import { REGIONS, REGION_KO } from "../model.js";
import { rowHTML } from "../components/row.js";
import { teamUrl } from "../state.js";

export function regionsHTML(items, tab) {
  var out = "";
  // REGIONS 밖의 지역 값은 "기타"로 모아 보여준다.
  REGIONS.concat("기타").forEach(function (reg) {
    var inReg = items.filter(function (it) { return (REGIONS.indexOf(it.region) < 0 ? "기타" : it.region) === reg; });
    if (!inReg.length) return;
    out += '<div class="rh"><h2>' + esc(REGION_KO[reg] || reg) + '</h2><span class="en">' + (REGION_KO[reg] ? reg : "") + '</span><span class="n">' + inReg.length + "건</span></div>";
    if (tab.mode !== "entry") {
      out += '<ul class="list">' + inReg.map(function (it) { return rowHTML(it, tab); }).join("") + "</ul>";
      return;
    }
    // 팀별로: 팀 이름 알파벳순, 팀마다 작은 머리글.
    var teams = [];
    inReg.forEach(function (it) { if (teams.indexOf(it.team) < 0) teams.push(it.team); });
    teams.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    teams.forEach(function (t) {
      var inTeam = inReg.filter(function (it) { return it.team === t; });
      // 팀 머리글도 팀 상세로 간다. 같은 팀 이름의 행은 같은 팀 ID 이므로 첫 행의 ID 를 쓴다.
      var tid = inTeam[0].tid, tname = tid ? '<a href="' + esc(teamUrl(tid)) + '">' + esc(t) + "</a>" : esc(t);
      out += '<h3 class="th">' + tname + (inTeam.length > 1 ? '<span class="n">' + inTeam.length + "명</span>" : "") + "</h3>";
      out += '<ul class="list">' + inTeam.map(function (it) { return rowHTML(it, tab, { noTeam: true }); }).join("") + "</ul>";
    });
  });
  return out;
}
