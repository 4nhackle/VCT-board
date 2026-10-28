import { esc, isNew, relDate, stampLabel, srcHTML } from "../format.js";
import { REGION_KO, pillOf } from "../model.js";
import { pill } from "./pill.js";
import { badge } from "./badge.js";

export function rowHTML(it, tab, opt) {
  if (tab.mode === "watch") {
    return '<li class="row"><div class="main"><span class="name">' + esc(it.team) + '</span></div><p class="detail">대상: ' + esc(it.name) + ". " + esc(it.note) + srcHTML(it.src) + "</p></li>";
  }
  var p = pillOf(it);
  var prefix = "";
  // 시트에서 빈 칸을 "-"로 적은 값은 보여주지 않는다.
  var meta = (it.sub || "").split(", ").filter(function (x) { return x && x !== "-"; }).join(", ");
  if (meta) prefix += '<span class="meta">' + esc(meta) + "</span>";
  if (!it.moved && !/^(팀 이탈|계약 완료|방출|이탈 보도)/.test(it.status)) prefix += esc(it.status) + ". ";
  opt = opt || {};
  return '<li class="row"><div class="main"><span class="name">' + esc(it.name) + "</span>" +
    (opt.noTeam ? "" : '<span class="team">' + esc(it.team) + "</span>") +
    (opt.region ? '<span class="reg">' + esc(REGION_KO[it.region] || it.region) + "</span>" : "") + "</div>" +
    '<div class="state">' + pill(p) + badge(it) +
    '<span class="date' + (isNew(it) ? " new" : "") + '">' + relDate(it.date) + (stampLabel(it) ? " " + stampLabel(it) : "") + " 보도</span></div>" +
    '<p class="detail">' + prefix + esc(it.note) + srcHTML(it.src) + "</p></li>";
}
