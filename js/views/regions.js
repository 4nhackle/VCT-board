import { esc, textHTML } from "../format.js";
import { REGIONS, regionName, regionShort, hasTail, ownItem } from "../model.js";
import { t, trWhole } from "../i18n.js";
import { rowHTML } from "../components/row.js";
import { splitNote, srcsHTML, noteText } from "./common.js";
import { teamUrl } from "../state.js";

// 팀 머리 아래 공통 배경: 본문과 출처 줄을 한 번만. 출처 링크는 그 배경을 가진 첫 행의 것을 쓴다.
function tnoteHTML(tail, row) {
  var sp = splitNote(noteText(tail));
  return '<div class="tnote">' + (sp.body ? '<p class="detail">' + textHTML(sp.body) + "</p>" : "") + srcsHTML(sp, row.src) + "</div>";
}

export function regionsHTML(items, tab) {
  var out = "";
  // REGIONS 밖의 지역 값은 "기타"로 모아 보여준다. "기타"는 묶음을 가르는 내부 키이고, 화면 글자는 사전에서 온다.
  REGIONS.concat("기타").forEach(function (reg) {
    var inReg = items.filter(function (it) { return (REGIONS.indexOf(it.region) < 0 ? "기타" : it.region) === reg; });
    if (!inReg.length) return;
    out += '<div class="rh"><h2>' + esc(reg === "기타" ? t("region.other") : regionShort(reg) || reg) + '</h2><span class="en">' + (regionName(reg) && regionName(reg) !== regionShort(reg) ? regionName(reg) : "") + '</span><span class="n">' + t("count.cases", { n: inReg.length }) + "</span></div>";
    if (tab.mode !== "entry") {
      out += '<ul class="list">' + inReg.map(function (it) { return rowHTML(it, tab); }).join("") + "</ul>";
      return;
    }
    // 팀별로: 팀 이름 알파벳순, 팀마다 작은 머리글.
    var teams = [];
    inReg.forEach(function (it) { if (teams.indexOf(it.team) < 0) teams.push(it.team); });
    teams.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    teams.forEach(function (teamName) {
      var inTeam = inReg.filter(function (it) { return it.team === teamName; });
      // 팀 머리글도 팀 상세로 간다. 같은 팀 이름의 행은 같은 팀 ID 이므로 첫 행의 ID 를 쓴다.
      var tid = inTeam[0].tid, tname = tid ? '<a href="' + esc(teamUrl(tid)) + '">' + textHTML(trWhole(teamName)) + "</a>" : textHTML(trWhole(teamName));
      // 한 명이어도 여러 명과 같은 모양(팀 이름 + 인원 수).
      out += '<h3 class="th">' + tname + '<span class="n">' + (inTeam.length === 1 ? t("count.person") : t("count.people", { n: inTeam.length })) + "</span></h3>";
      // 공통 배경은 팀 머리 아래 한 번. 행에는 개인 부분만 보여 준다.
      var tail = tab.shared.get(teamName), first = inTeam.filter(function (it) { return hasTail(it.note, tail); })[0];
      if (first) out += tnoteHTML(tail, first);
      out += '<ul class="list">' + inTeam.map(function (it) { return rowHTML(ownItem(it, tab.shared), tab, { noTeam: true }); }).join("") + "</ul>";
    });
  });
  return out;
}
