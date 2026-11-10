import { esc, textHTML } from "../format.js";
import { personUrl, teamUrl } from "../state.js";
import { REGIONS, regionName, regionShort, cleanName } from "../model.js";
import { t } from "../i18n.js";
import { nameHTML } from "./common.js";

// 검색: 팀 이름·짧은 이름·ID 가 맞으면 팀 전체, 아니면 이름·실명·역할이 맞는 인물만 남긴다. 원래 카드는 바꾸지 않는다(inCount·outCount·partial 은 팀 기준).
function searchCard(c, q) {
  var tm = c.team, has = function (s) { return String(s || "").toLowerCase().indexOf(q) >= 0; };
  if ([tm.name, tm.short, tm.id].concat(tm.aliases || []).some(has)) return c;
  var hits = c.roster.filter(function (p) { return has(p.name) || has(p.realName) || has(p.role); });
  return hits.length ? Object.assign({}, c, { roster: hits }) : null;
}

// 로스터 탭: 지역 거르기(state.region)와 검색(state.q)을 적용한다. 지역 머리(.rh), 팀 머리(.th), 인물마다 목록 한 줄(목록 모양은 선수 탭과 같다).
export function rosterHTML(cards, state) {
  var shown = cards.filter(function (c) { return state.region === "all" || c.team.region === state.region; });
  var q = String(state.q || "").trim().toLowerCase();
  if (q) shown = shown.map(function (c) { return searchCard(c, q); }).filter(Boolean);
  if (!shown.length) return '<div class="empty">' + t("msg.empty") + "</div>";
  var out = "";
  // REGIONS 밖의 지역 값은 "기타"로 모은다(regionsHTML 과 같은 규칙).
  REGIONS.concat("기타").forEach(function (reg) {
    var inReg = shown.filter(function (c) { return (REGIONS.indexOf(c.team.region) < 0 ? "기타" : c.team.region) === reg; });
    if (!inReg.length) return;
    out += '<div class="rh"><h2>' + esc(reg === "기타" ? t("region.other") : regionShort(reg) || reg) + '</h2><span class="en">' + (regionName(reg) && regionName(reg) !== regionShort(reg) ? regionName(reg) : "") + '</span><span class="n">' + t("count.teams", { n: inReg.length }) + "</span></div>";
    inReg.forEach(function (c) {
      var tm = c.team;
      out += '<h3 class="th"><a href="' + esc(teamUrl(tm.id)) + '">' + textHTML(tm.name || tm.id) + '</a><span class="n"><span class="in">+' + c.inCount + '</span> <span class="out">−' + c.outCount + "</span></span></h3>";
      if (c.partial) out += '<p class="hint">' + t("roster.partial") + "</p>";
      if (!c.roster.length) { out += '<p class="hint">' + t(tm.active === false ? "msg.teamClosed" : "msg.rosterPending") + "</p>"; return; }
      out += '<ul class="list">' + c.roster.map(function (p) {
        var role = cleanName(p.role) || "";
        return '<li class="row roster"><div class="main"><a class="name" href="' + esc(personUrl(p.id)) + '">' + nameHTML(p.name || p.id) + "</a>" + (role ? '<span class="meta">' + esc(role) + "</span>" : "") + '</div><div class="state"><span class="lead">' + t(p.kind === "coach" ? "team.coaches" : "team.players") + "</span></div></li>";
      }).join("") + "</ul>";
    });
  });
  return out;
}
