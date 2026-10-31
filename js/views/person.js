import { esc, relDate, stampOf, stampLabel, srcHTML, fmtDate, isoOf } from "../format.js";
import { REGION_KO, TIER_KO, pillOf, ageOf, contractState, careerOf, newestFirst } from "../model.js";
import { pill } from "../components/pill.js";
import { badge } from "../components/badge.js";
import { listUrl, teamUrl } from "../state.js";

// 소식 줄 앞에 붙는 탭 이름. 이적 행은 선수·코치 구분 없이 "이적 완료" 탭에 모인다.
var TAB_NAME = { player: "선수", coach: "코치·스태프", t: "이적 완료" };

// 빈 칸과 "-" 는 보여 주지 않는다.
function val(v) { return v && v !== "-" ? v : ""; }

// "2026-11" → "2026.11"
function dotYM(s) { return String(s || "").replace("-", "."); }

// 계약 만료일과 상태. 값이 없으면 "미공개".
function contractText(n) {
  if (typeof n !== "number") return "미공개";
  return isoOf(n) + " (" + contractState(n).label + ")";
}

// "← 목록으로". 클릭은 main.js 가 맡는다(목록에서 왔으면 뒤로 가기).
export function backHTML() {
  return '<a class="back" href="' + esc(listUrl("players")) + '" data-back="1">← 목록으로</a>';
}

// 나이 표시: 생일을 알면 "N세", 연도만 알면 "약 N세".
function ageText(birth) {
  var a = ageOf(birth);
  if (!a) return "";
  return (a.approx ? "약 " : "") + a.age + "세";
}

// 외부 링크(VLR·Liquipedia). 주소가 http(s) 인 것만 낸다.
function linksHTML(links) {
  var out = [["vlr", "VLR"], ["liquipedia", "Liquipedia"]].filter(function (l) {
    return links && /^https?:\/\//i.test(links[l[0]] || "");
  }).map(function (l) {
    return '<a href="' + esc(links[l[0]]) + '" target="_blank" rel="noopener">' + l[1] + "</a>";
  });
  return out.length ? '<p class="dp-links">' + out.join("") + "</p>" : "";
}

// 이번 이동 카드. 가장 최근 소식이 이적이면 "이전 팀 → 새 팀", 아니면 "소속 팀 · 상태".
// 보도일(date)과 공식 발표일(signedDate)은 글자로 구분해 따로 적는다.
function moveHTML(list, p) {
  var top = list[0], it = top.item, facts = [];
  var isMove = top.kind === "t";
  facts.push("<li>보도 " + fmtDate(it.date) + (srcHTML(it.src) ? " " + srcHTML(it.src) : "") + "</li>");
  if (isMove) {
    if (typeof top.row.signedDate === "number") facts.push("<li>공식 발표 " + fmtDate(top.row.signedDate) + "</li>");
    else if (top.row.conf === "R") facts.push("<li>공식 발표 전</li>");
    // 이전 계약: 이적 전 LFT·FA 행의 계약, 없으면 people 의 계약.
    var prev = list.filter(function (e) { return e.kind !== "t" && typeof e.row.contractUntil === "number"; })[0];
    var prevUntil = prev ? prev.row.contractUntil : (p && typeof p.contractUntil === "number" ? p.contractUntil : undefined);
    facts.push("<li>이전 계약 만료 " + contractText(prevUntil) + "</li>");
    facts.push("<li>새 계약 만료 " + contractText(top.row.contractUntil) + "</li>");
  } else {
    var until = typeof top.row.contractUntil === "number" ? top.row.contractUntil : (p ? p.contractUntil : undefined);
    facts.push("<li>계약 만료 " + contractText(until) + "</li>");
  }
  var title = isMove ? val(it.team) + " → " + val(it.next) : [val(it.team), val(it.status)].filter(Boolean).join(" · ");
  return '<section class="dp-sec dp-move"><h2>이번 이동</h2>' +
    '<p class="dp-move-title">' + esc(title) + (badge(it) ? " " + badge(it) : "") + "</p>" +
    '<ul class="dp-facts">' + facts.join("") + "</ul></section>";
}

// 팀 카드 한 장. teams 에 없으면 이름만 보여 주고 링크는 그대로 둔다.
function teamCard(id, fallback, teams) {
  var t = teams[id], name = t ? t.name : fallback;
  var facts = t ? [REGION_KO[t.region] || val(t.region), val(t.country), TIER_KO[t.tier] || ""].filter(Boolean) : [];
  return '<li class="dp-team"><a href="' + esc(teamUrl(id)) + '">' + esc(name) + "</a>" +
    (facts.length ? ' <span class="dp-facts-inline">' + facts.map(esc).join(" · ") + "</span>" : "") +
    (t && t.active === false ? ' <span class="dp-off">운영 종료</span>' : "") + "</li>";
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
  return cards.length ? '<section class="dp-sec"><h2>팀 정보</h2><ul class="dp-teams">' + cards.join("") + "</ul></section>" : "";
}

// 경력 타임라인: 최신순, 진행 중 칸을 강조한다. 경력이 없으면 구역을 숨긴다.
function careerHTML(p, teams) {
  var rows = careerOf(p);
  if (!rows.length) return "";
  var items = rows.map(function (c) {
    var t = teams[c.team], name = t ? t.name : c.team;
    return '<li class="dp-cr' + (c.current ? " now" : "") + '"><span class="dp-cr-when">' + esc(dotYM(c.from)) + " – " + (c.to ? esc(dotYM(c.to)) : "") + "</span>" +
      '<a href="' + esc(teamUrl(c.team)) + '">' + esc(name) + "</a>" +
      (c.role ? ' <span class="dp-cr-role">(' + esc(c.role) + ")</span>" : "") +
      (c.current ? ' <span class="dp-now">진행 중</span>' : "") + "</li>";
  });
  return '<section class="dp-sec"><h2>경력</h2><ol class="dp-career">' + items.join("") + "</ol></section>";
}

function newsRow(e) {
  var it = e.item;
  var when = relDate(it.date) + (stampLabel(it) ? " " + stampLabel(it) : "");
  var teamText = e.kind === "t" ? [val(it.team), val(it.next)].filter(Boolean).join(" → ") : val(it.team);
  var meta = [TAB_NAME[e.kind], teamText].filter(Boolean).map(esc).join(" · ");
  return '<li class="dp-row"><p class="dp-meta">' + when + (meta ? " · " + meta : "") + "</p>" +
    '<p class="dp-line">' + pill(pillOf(it)) + badge(it) + (val(it.note) ? " " + esc(it.note) : "") + srcHTML(it.src) + "</p></li>";
}

// 인물 상세 화면. 찾지 못하면 name 이 빈 문자열이다.
export function personHTML(id, IDX) {
  var list = (IDX.byPerson[id] || []).slice().sort(newestFirst), p = IDX.people[id], teams = IDX.teams;
  if (!list.length && !p) return { name: "", html: '<section class="detail-page">' + backHTML() + '<div class="empty">찾을 수 없는 선수입니다.</div></section>' };
  var name = val(p && p.name) || (list[0] ? list[0].row.name : "");
  // 국적·역할: people 값 우선, 없으면 최신순으로 처음 나오는 소식 행의 값.
  var nat = p ? val(p.nationality) : "", role = p ? val(p.role) : "";
  list.forEach(function (e) {
    if (!nat) nat = val(e.row.nationality);
    if (!role) role = val(e.row.role) || val(e.row.position);
  });
  var sub = [nat, role, p && p.birth ? ageText(p.birth) : ""].filter(Boolean).join(" · ");
  var head = '<header class="dp-head"><h2 class="dp-name">' + esc(name) +
    (p && val(p.realName) ? ' <span class="dp-real">' + esc(p.realName) + "</span>" : "") + "</h2>" +
    (sub ? '<p class="dp-sub">' + esc(sub) + "</p>" : "") +
    (list.length ? '<div class="dp-state">' + pill(pillOf(list[0].item)) + badge(list[0].item) + "</div>" : "") +
    (p ? linksHTML(p.links) : "") + "</header>";
  var notice = p ? "" : '<p class="dp-note">선수 정보는 정리 중입니다.</p>';
  var move = list.length ? moveHTML(list, p) : "";
  var teamSec = teamsHTML(list, p, teams);
  var news = list.length ? '<ul class="dp-list">' + list.map(newsRow).join("") + "</ul>" : '<p class="dp-note">관련 소식이 없습니다.</p>';
  return {
    name: name,
    html: '<section class="detail-page">' + backHTML() + head + notice + move + teamSec + careerHTML(p, teams) +
      '<div class="dp-sec"><h2>관련 소식</h2>' + news + "</div></section>"
  };
}
