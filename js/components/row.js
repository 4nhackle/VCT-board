import { esc, isNew, isoOf, relDate, stampLabel, textHTML } from "../format.js";
import { regionShort, pillOf, routeOf, slugOf, watchMeta, cleanName, contractOK } from "../model.js";
import { t, trWhole } from "../i18n.js";
import { splitNote, srcsHTML, termHTML, nameHTML, noteText } from "../views/common.js";
import { personUrl, teamUrl } from "../state.js";
import { pill } from "./pill.js";
import { routeHTML } from "./route.js";
import { badge } from "./badge.js";

// id 가 없으면 링크 없이 글자만 둔다. html 은 이미 이스케이프된 글이다.
function link(cls, href, html) {
  return href ? '<a class="' + cls + '" href="' + esc(href) + '">' + html + "</a>" : '<span class="' + cls + '">' + html + "</span>";
}

// 지켜볼 팀 행: 종류 배지와 팀 링크, 확정·확인 날짜, "대상" 라벨, 본문, 출처 줄.
function watchHTML(it, tab) {
  // 대상 팀마다 따로 링크한다. 팀 이름 칸은 " / " 로 나뉘어 있다. teams 에 없는 ID 는 링크 없이 글자만.
  var parts = String(it.team || "").split(" / ");
  var names = parts.map(function (n, i) {
    var id = it.tids && it.tids.length === parts.length ? it.tids[i] : slugOf(n);
    return link("name", id && tab.teams && tab.teams.has(id) ? teamUrl(id) : "", textHTML(n));
  }).join(" / ");
  var w = watchMeta(it.note), sp = splitNote(noteText(w.body, true));
  var state = (w.confirmed ? '<span class="ok">' + t("row.confirmed") + "</span>" : "") + (w.checked ? '<span class="chk">' + t("row.checked", { date: esc(w.checked) }) + "</span>" : "");
  return '<li class="row watch"><div class="main">' + (w.kind ? '<span class="wk ' + w.kind + '">' + esc(w.label) + "</span>" : "") + names + "</div>" +
    (state ? '<div class="state">' + state + "</div>" : "") +
    '<p class="detail"><span class="lbl">' + t("row.target") + "</span>" + termHTML(it.name) + "</p>" +
    (sp.body ? '<p class="detail">' + textHTML(sp.body) + "</p>" : "") + srcsHTML(sp, it.src) + "</li>";
}

export function rowHTML(it, tab, opt) {
  if (tab.mode === "watch") return watchHTML(it, tab);
  var p = pillOf(it), sp = splitNote(noteText(it.note)), lead = "";
  // 시트에서 빈 칸을 "-"로 적은 값은 보여주지 않는다. 직책·국적은 용어집으로 옮긴다.
  var meta = (it.sub || "").split(", ").filter(cleanName).map(function (x) { return termHTML(x); }).join(" · ");
  // 계약 만료를 알면 메타 줄 끝에 "계약 ~2027" 처럼 붙인다(연도면 연도, 날짜면 ISO 날짜). 없으면 메타 줄은 그대로다.
  if (contractOK(it.contract)) {
    var ctx = t("row.contract", { x: typeof it.contract === "number" ? isoOf(it.contract) : it.contract });
    meta = meta ? meta + " · " + esc(ctx) : esc(ctx);
  }
  // 데이터 판정용 글자(상태 글 앞머리). 판정은 원문으로 하고, 화면 글자는 용어집 또는 원문 + KR 로 보인다.
  if (!it.moved && !/^(팀 이탈|계약 완료|방출|이탈 보도)/.test(it.status)) lead = termHTML(it.status) + ". ";
  opt = opt || {};
  // 이동이면 경로 줄이 출발·도착 팀을 보여 주므로 팀 링크 대신 쓴다. 팀별 보기는 팀 머리가 출발 팀이라 도착만 쓴다.
  var r = routeOf(it, tab.teamObj), route = r ? routeHTML(r, { noFrom: !!opt.noTeam }) : "";
  // 요약(caption)이 있으면 설명글로 쓴다. 출처 줄과 보도 시각은 메모 기준 그대로다. 없으면 메모 본문.
  var cap = cleanName(it.caption), body = cap ? noteText(cap) : sp.body;
  return '<li class="row s-' + (p[2] === "reported" ? "reported" : p[0]) + '"><div class="main">' + link("name", it.pid ? personUrl(it.pid) : "", nameHTML(it.name)) +
    (r || opt.noTeam ? "" : link("team", it.tid ? teamUrl(it.tid) : "", textHTML(trWhole(it.team)))) +
    (opt.region ? '<span class="reg">' + esc(regionShort(it.region) || it.region) + "</span>" : "") +
    route + (meta ? '<span class="meta">' + meta + "</span>" : "") + "</div>" +
    '<div class="state">' + pill(p) + badge(it) +
    '<span class="date' + (isNew(it) ? " new" : "") + '">' + relDate(it.date) + (stampLabel(it) && !sp.src ? " " + stampLabel(it) : "") + t("pill.reportedMark") + "</span></div>" +
    (lead || body ? '<p class="detail">' + lead + textHTML(body) + "</p>" : "") + (opt.more || "") + srcsHTML(sp, it.src) + "</li>";
}
