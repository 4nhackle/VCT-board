import { esc, isNew, relDate, stampLabel } from "../format.js";
import { REGION_KO, pillOf, routeOf, slugOf, watchMeta } from "../model.js";
import { splitNote, srcsHTML } from "../views/common.js";
import { personUrl, teamUrl } from "../state.js";
import { pill } from "./pill.js";
import { routeHTML } from "./route.js";
import { badge } from "./badge.js";

// id 가 없으면 링크 없이 글자만 둔다.
function link(cls, href, text) {
  return href ? '<a class="' + cls + '" href="' + esc(href) + '">' + esc(text) + "</a>" : '<span class="' + cls + '">' + esc(text) + "</span>";
}

// 지켜볼 팀 행: 종류 배지와 팀 링크, 확정·확인 날짜, "대상" 라벨, 본문, 출처 줄.
function watchHTML(it, tab) {
  // 대상 팀마다 따로 링크한다. 팀 이름 칸은 " / " 로 나뉘어 있다. teams 에 없는 ID 는 링크 없이 글자만.
  var parts = String(it.team || "").split(" / ");
  var names = parts.map(function (n, i) {
    var id = it.tids && it.tids.length === parts.length ? it.tids[i] : slugOf(n);
    return link("name", id && tab.teams && tab.teams.has(id) ? teamUrl(id) : "", n);
  }).join(" / ");
  var w = watchMeta(it.note), sp = splitNote(w.body);
  var state = (w.confirmed ? '<span class="ok">확정</span>' : "") + (w.checked ? '<span class="chk">확인 ' + esc(w.checked) + "</span>" : "");
  return '<li class="row watch"><div class="main">' + (w.kind ? '<span class="wk ' + w.kind + '">' + esc(w.label) + "</span>" : "") + names + "</div>" +
    (state ? '<div class="state">' + state + "</div>" : "") +
    '<p class="detail"><span class="lbl">대상</span>' + esc(it.name) + "</p>" +
    (sp.body ? '<p class="detail">' + esc(sp.body) + "</p>" : "") + srcsHTML(sp, it.src) + "</li>";
}

export function rowHTML(it, tab, opt) {
  if (tab.mode === "watch") return watchHTML(it, tab);
  var p = pillOf(it), sp = splitNote(it.note), lead = "";
  // 시트에서 빈 칸을 "-"로 적은 값은 보여주지 않는다.
  var meta = (it.sub || "").split(", ").filter(function (x) { return x && x !== "-"; }).join(" · ");
  if (!it.moved && !/^(팀 이탈|계약 완료|방출|이탈 보도)/.test(it.status)) lead = esc(it.status) + ". ";
  opt = opt || {};
  // 이동이면 경로 줄이 출발·도착 팀을 보여 주므로 팀 링크 대신 쓴다. 팀별 보기는 팀 머리가 출발 팀이라 도착만 쓴다.
  var r = routeOf(it, tab.teamObj), route = r ? routeHTML(r, { noFrom: !!opt.noTeam }) : "";
  return '<li class="row s-' + (p[2] === "reported" ? "reported" : p[0]) + '"><div class="main">' + link("name", it.pid ? personUrl(it.pid) : "", it.name) +
    (r || opt.noTeam ? "" : link("team", it.tid ? teamUrl(it.tid) : "", it.team)) +
    (opt.region ? '<span class="reg">' + esc(REGION_KO[it.region] || it.region) + "</span>" : "") +
    route + (meta ? '<span class="meta">' + esc(meta) + "</span>" : "") + "</div>" +
    '<div class="state">' + pill(p) + badge(it) +
    '<span class="date' + (isNew(it) ? " new" : "") + '">' + relDate(it.date) + (stampLabel(it) && !sp.src ? " " + stampLabel(it) : "") + " 보도</span></div>" +
    (lead || sp.body ? '<p class="detail">' + lead + esc(sp.body) + "</p>" : "") + (opt.more || "") + srcsHTML(sp, it.src) + "</li>";
}
