import { esc, isNew, relDate, stampLabel, srcHTML } from "../format.js";
import { REGION_KO, pillOf, slugOf } from "../model.js";
import { personUrl, teamUrl } from "../state.js";
import { pill } from "./pill.js";
import { badge } from "./badge.js";

// id 가 없으면 링크 없이 글자만 둔다.
function link(cls, href, text) {
  return href ? '<a class="' + cls + '" href="' + esc(href) + '">' + esc(text) + "</a>" : '<span class="' + cls + '">' + esc(text) + "</span>";
}

export function rowHTML(it, tab, opt) {
  if (tab.mode === "watch") {
    // 대상 팀마다 따로 링크한다. 팀 이름 칸은 " / " 로 나뉘어 있다.
    var parts = String(it.team || "").split(" / ");
    var names = parts.map(function (n, i) {
      var id = it.tids && it.tids.length === parts.length ? it.tids[i] : slugOf(n);
      return link("name", id ? teamUrl(id) : "", n);
    }).join(" / ");
    return '<li class="row"><div class="main">' + names + '</div><p class="detail">대상: ' + esc(it.name) + ". " + esc(it.note) + srcHTML(it.src) + "</p></li>";
  }
  var p = pillOf(it);
  var prefix = "";
  // 시트에서 빈 칸을 "-"로 적은 값은 보여주지 않는다.
  var meta = (it.sub || "").split(", ").filter(function (x) { return x && x !== "-"; }).join(", ");
  if (meta) prefix += '<span class="meta">' + esc(meta) + "</span>";
  if (!it.moved && !/^(팀 이탈|계약 완료|방출|이탈 보도)/.test(it.status)) prefix += esc(it.status) + ". ";
  opt = opt || {};
  return '<li class="row"><div class="main">' + link("name", it.pid ? personUrl(it.pid) : "", it.name) +
    (opt.noTeam ? "" : link("team", it.tid ? teamUrl(it.tid) : "", it.team)) +
    (opt.region ? '<span class="reg">' + esc(REGION_KO[it.region] || it.region) + "</span>" : "") + "</div>" +
    '<div class="state">' + pill(p) + badge(it) +
    '<span class="date' + (isNew(it) ? " new" : "") + '">' + relDate(it.date) + (stampLabel(it) ? " " + stampLabel(it) : "") + " 보도</span></div>" +
    '<p class="detail">' + prefix + esc(it.note) + srcHTML(it.src) + "</p></li>";
}
