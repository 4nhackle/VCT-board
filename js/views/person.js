import { esc, srcHTML, fmtDate, isoOf, textHTML } from "../format.js";
import { regionName, tierName, pillOf, routeOf, ageOf, contractOK, contractState, careerOf, newestFirst } from "../model.js";
import { t, LANG } from "../i18n.js";
import { pill } from "../components/pill.js";
import { badge } from "../components/badge.js";
import { routeHTML } from "../components/route.js";
import { listUrl, teamUrl } from "../state.js";
import { val, newsRow, infoHTML, monoHTML, termHTML, nameHTML } from "./common.js";

// "2026-11" → "2026.11"
function dotYM(s) { return String(s || "").replace("-", "."); }

// 계약 만료일과 상태. 값이 없으면 "미공개".
function contractText(n) {
  if (!contractOK(n)) return t("label.undisclosed");
  // 연도만 있는 값은 날짜를 만들지 않고 연도 글만 보인다.
  if (typeof n === "string") return contractState(n).label;
  return isoOf(n) + " (" + contractState(n).label + ")";
}

// "← 목록으로". 클릭은 main.js 가 맡는다(목록에서 왔으면 뒤로 가기).
export function backHTML() {
  return '<a class="back" href="' + esc(listUrl("players")) + '" data-back="1">' + t("nav.back") + "</a>";
}

// 생년월일 칸. 날짜를 알면 날짜와 나이, 연도만 알면 "연도 (약 N세)". 만 18세 미만은 날짜를 숨기고 연도만 보인다.
// 값이 없거나 잘못되면 "" 이다(칸이 "미공개"로 바뀐다). today 는 시험용(기본 TODAY).
export function birthText(birth, today) {
  var a = ageOf(birth, today), s = String(birth), y = s.slice(0, 4);
  if (!a) return "";
  if (a.approx) return t("birth.year", { y: y, n: a.age });
  if (a.age < 18) return t("birth.minor", { y: y, n: a.age });
  var d = s;
  if (LANG === "en") d = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(+y, +s.slice(5, 7) - 1, +s.slice(8, 10))));
  return t("birth.full", { d: d, n: a.age });
}

// 외부 링크(VLR·Liquipedia). 주소가 http(s) 인 것만 낸다. Liquipedia 에는 CC BY-SA 출처 표기를 붙인다.
function linksHTML(links) {
  var out = [["vlr", "VLR"], ["liquipedia", "Liquipedia"]].filter(function (l) {
    return links && /^https?:\/\//i.test(links[l[0]] || "");
  }).map(function (l) {
    return '<a href="' + esc(links[l[0]]) + '" target="_blank" rel="noopener">' + l[1] + "</a>" +
      (l[0] === "liquipedia" ? ' <span class="lic">' + t("link.licence") + "</span>" : "");
  });
  return out.length ? '<p class="dp-links">' + out.join("") + "</p>" : "";
}

// 이번 이동 카드. 가장 최근 소식이 이적이면 "이전 팀 → 새 팀", 아니면 "소속 팀 · 상태".
// 보도일(date)과 공식 발표일(signedDate)은 글자로 구분해 따로 적는다.
// 이번 이동과 머리 경로의 기준 항목: 가장 최근 이적 행, 없으면 가장 최근 항목.
function moveTop(list) { return list.filter(function (e) { return e.kind === "t"; })[0] || list[0]; }

function moveHTML(list, p, teams) {
  var top = moveTop(list), it = top.item, facts = [], r = routeOf(it, teams);
  var isMove = top.kind === "t";
  facts.push("<li>" + t("fact.reported", { date: fmtDate(it.date) }) + (srcHTML(it.src) ? " " + srcHTML(it.src) : "") + "</li>");
  if (isMove) {
    if (typeof top.row.signedDate === "number") facts.push("<li>" + t("fact.official", { date: fmtDate(top.row.signedDate) }) + "</li>");
    else if (top.row.conf === "R") facts.push("<li>" + t("fact.notOfficial") + "</li>");
    // 이전 계약: 이적 전 LFT·FA 행의 계약, 없으면 people 의 계약.
    var prev = list.filter(function (e) { return e.kind !== "t" && contractOK(e.row.contractUntil); })[0];
    var prevUntil = prev ? prev.row.contractUntil : (p && contractOK(p.contractUntil) ? p.contractUntil : undefined);
    facts.push("<li>" + t("fact.prevContract", { x: contractText(prevUntil) }) + "</li>");
    facts.push("<li>" + t("fact.newContract", { x: contractText(top.row.contractUntil) }) + "</li>");
  } else {
    var until = contractOK(top.row.contractUntil) ? top.row.contractUntil : (p ? p.contractUntil : undefined);
    facts.push("<li>" + t("fact.contract", { x: contractText(until) }) + "</li>");
  }
  // 제목은 경로 줄(출발 → 도착). 경로가 없으면 "소속 · 상태". 합류 단계와 꾸밈말은 뒤의 작은 배지로 둔다.
  var title = r ? routeHTML(r) : [textHTML(val(it.team)), termHTML(val(it.status))].filter(Boolean).join(" · ");
  var stage = r && r.kind === "move" ? (r.stage === "reported" ? '<span class="tag">' + t("tag.reported") + "</span>" : r.stage === "confirmed" ? '<span class="tag">' + t("tag.confirmed") + "</span>" : "") : "";
  var note = r && r.note ? '<span class="tag">' + textHTML(r.note) + "</span>" : "";
  return '<section class="dp-sec dp-move"><h2>' + t("h.thisMove") + "</h2>" +
    '<p class="dp-move-title">' + title + (badge(it) ? " " + badge(it) : "") + (stage ? " " + stage : "") + (note ? " " + note : "") + "</p>" +
    '<ul class="dp-facts">' + facts.join("") + "</ul></section>";
}

// 팀 카드 한 장. teams 에 없으면 이름만 보여 주고 링크는 그대로 둔다.
function teamCard(id, fallback, teams) {
  var team = teams[id], name = team ? team.name : fallback;
  var facts = team ? [regionName(team.region) || val(team.region), val(team.country), tierName(team.tier) || ""].filter(Boolean) : [];
  return '<li class="dp-team"><a href="' + esc(teamUrl(id)) + '">' + textHTML(name) + "</a>" +
    (facts.length ? ' <span class="dp-facts-inline">' + facts.map(function (x) { return textHTML(x); }).join(" · ") + "</span>" : "") +
    (team && team.active === false ? ' <span class="dp-off">' + t("team.closed") + "</span>" : "") + "</li>";
}

// 팀 정보: 이번 이동에 나온 팀(이전·새), 아니면 최근 소식의 팀, 그리고 현재 소속 팀. 중복은 뺀다.
function teamsHTML(list, p, teams) {
  var seen = [], cards = [];
  function add(id, name) {
    if (!id || seen.indexOf(id) >= 0) return;
    seen.push(id);
    cards.push(teamCard(id, name || id, teams));
  }
  if (list.length) {
    var top = list[0], it = top.item;
    if (top.kind === "t") { add(it.tidFrom, it.team); add(it.tidTo, it.next); }
    else add(it.tid, it.team);
  }
  var cur = careerOf(p).filter(function (c) { return c.current; })[0];
  if (cur) add(cur.team, cur.team);
  return cards.length ? '<section class="dp-sec"><h2>' + t("h.teamInfo") + '</h2><ul class="dp-teams">' + cards.join("") + "</ul></section>" : "";
}

// 경력 타임라인: 최신순, 진행 중 칸을 강조한다. 경력이 없으면 구역을 숨긴다.
function careerHTML(p, teams) {
  var rows = careerOf(p);
  if (!rows.length) return "";
  var items = rows.map(function (c) {
    var team = teams[c.team], name = team ? team.name : c.team;
    return '<li class="dp-cr' + (c.current ? " now" : "") + '"><span class="dp-cr-when">' + esc(dotYM(c.from)) + " – " + (c.to ? esc(dotYM(c.to)) : "") + "</span>" +
      '<a href="' + esc(teamUrl(c.team)) + '">' + textHTML(name) + "</a>" +
      (c.role ? ' <span class="dp-cr-role">(' + termHTML(c.role) + ")</span>" : "") +
      (c.current ? ' <span class="dp-now">' + t("status.ongoing") + "</span>" : "") +
      (c.upcoming ? ' <span class="dp-facts-inline">' + t("career.upcoming") + "</span>" : "") + "</li>";
  });
  return '<section class="dp-sec"><h2>' + t("h.career") + '</h2><ol class="dp-career">' + items.join("") + "</ol></section>";
}

// 정보 칸: 소속 팀, 역할, 국적, 생년월일, 계약 만료, 이적 완료. 사람마다 같은 여섯 칸.
function personInfo(list, p, teams, nat, role) {
  var top = list[0], cur = careerOf(p).filter(function (c) { return c.current; })[0], team = "", until, done = "";
  if (cur) team = '<a href="' + esc(teamUrl(cur.team)) + '">' + textHTML(teams[cur.team] ? teams[cur.team].name : cur.team) + "</a>";
  else if (top) team = textHTML(top.kind === "t" ? val(top.item.next) : val(top.item.team));
  if (top && top.kind === "t") {
    until = top.row.contractUntil;
    done = typeof top.row.signedDate === "number" ? isoOf(top.row.signedDate) : t("fact.notOfficial");
  } else {
    until = top && contractOK(top.row.contractUntil) ? top.row.contractUntil : p ? p.contractUntil : undefined;
  }
  var a = p && p.birth ? birthText(p.birth) : "";
  return [
    [t("info.team"), team],
    [t("info.role"), termHTML(role)],
    [t("info.nationality"), textHTML(nat)],
    [t("info.birth"), a ? esc(a) : ""],
    [t("info.contract"), contractOK(until) ? esc(contractText(until)) : ""],
    [t("info.done"), esc(done)]
  ];
}

// 인물 상세 화면. 찾지 못하면 name 이 빈 문자열이다.
export function personHTML(id, IDX) {
  var list = (IDX.byPerson[id] || []).slice().sort(newestFirst), p = IDX.people[id], teams = IDX.teams;
  if (!list.length && !p) return { name: "", html: '<section class="detail-page">' + backHTML() + '<div class="empty">' + t("msg.notfoundPlayer") + "</div></section>" };
  var name = val(p && p.name) || (list[0] ? list[0].row.name : "");
  // 국적·역할: people 값 우선, 없으면 최신순으로 처음 나오는 소식 행의 값.
  var nat = p ? val(p.nationality) : "", role = p ? val(p.role) : "";
  list.forEach(function (e) {
    if (!nat) nat = val(e.row.nationality);
    if (!role) role = val(e.row.role) || val(e.row.position);
  });
  // 머리의 경로 줄: 가장 최근 이적의 출발 → 도착. 이동이 아니면 줄을 두지 않는다.
  var moveRoute = list.length ? routeOf(moveTop(list).item, teams) : null;
  var head = '<header class="dp-head">' + monoHTML(name) + '<h1 class="dp-name">' + nameHTML(name) +
    "</h1>" + (p && val(p.realName) ? '<p class="dp-real">' + nameHTML(p.realName) + "</p>" : "") +
    (list.length ? '<div class="dp-state">' + pill(pillOf(list[0].item)) + badge(list[0].item) + "</div>" : "") +
    (moveRoute ? '<p class="dp-route">' + routeHTML(moveRoute) + "</p>" : "") +
    (p ? linksHTML(p.links) : "") + (p ? "" : '<p class="dp-note">' + t("msg.playerPending") + "</p>") + "</header>";
  var notice = infoHTML(personInfo(list, p, teams, nat, role));
  var move = list.length ? moveHTML(list, p, teams) : "";
  var teamSec = teamsHTML(list, p, teams);
  var news = list.length ? '<ul class="dp-list">' + list.map(function (e) { return newsRow(e, false); }).join("") + "</ul>" : '<p class="dp-note">' + t("msg.noNews") + "</p>";
  return {
    name: name,
    html: '<section class="detail-page">' + backHTML() + head + notice + move + teamSec + careerHTML(p, teams) +
      '<div class="dp-sec"><h2>' + t("h.news") + "</h2>" + news + "</div></section>"
  };
}
