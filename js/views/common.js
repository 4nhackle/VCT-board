import { esc, relDate, srcHTML, stampLabel, parseStamp, dateWord, clockText, textHTML, krHTML } from "../format.js";
import { t, LANG, trWhole, trNote } from "../i18n.js";
import { termEn } from "../i18n/glossary.js";
import { pillOf, routeOf, watchMeta } from "../model.js";
import { STAMP_RE, CROSS_RE } from "../note.js";
import { pill } from "../components/pill.js";
import { badge } from "../components/badge.js";
import { personUrl } from "../state.js";

// 상세 화면이 함께 쓰는 값과 줄 모양. person.js 와 team.js 가 가져다 쓴다.
// 소식 줄 앞의 탭 이름. 쓰는 시점에 사전을 읽는다. 이적 행은 선수·코치 구분 없이 "이적 완료" 탭에 모인다.
var TAB_KEY = { player: "tab.players", coach: "tab.coaches", t: "tab.transfers", watch: "tab.watch" };
export function tabName(kind) { return TAB_KEY[kind] ? t(TAB_KEY[kind]) : ""; }

// 빈 칸과 "-" 는 보여 주지 않는다.
export function val(v) { return v && v !== "-" ? v : ""; }

// 데이터 문구(상태·구분·역할·대상). 영문 화면에서 용어집으로 옮겨지면 영문, 못 옮기면 원문 + KR. 한국어 화면은 esc 와 같다.
export function termHTML(text) {
  if (LANG !== "en") return esc(text);
  var en = termEn(text);
  return en === null ? krHTML(text) : esc(en);
}

// 사람 이름. 한국어 본명·이름은 lang="ko" 만 붙이고 KR 표시는 붙이지 않는다(사람 이름이라 번역하지 않는다).
export function nameHTML(text) {
  var s = String(text == null ? "" : text);
  return LANG === "en" && /[가-힣]/.test(s) ? '<span lang="ko">' + esc(s) + "</span>" : esc(s);
}

// 인물 이름 링크. pid 가 없으면 링크 없이 html 만 둔다. html 은 이미 이스케이프된 글이다.
function nameLink(pid, html) {
  return pid ? '<a href="' + esc(personUrl(pid)) + '">' + html + "</a>" : html;
}

// 비고 글에서 원자료를 떼어 낸다. 데이터는 그대로 두고 화면에서만 나눈다.
// - 끝의 "(출처이름 M/D HH:mm UTC|KST)" → src {name, when}. when 은 한국 시간 "M/D 오전 h:mm".
// - "교차 확인: A, B" 구절(다음 마침표 또는 끝까지) → cross [A, B].
// 규칙에 맞지 않는 부분은 body 에 원문 그대로 남는다.
// 영문 화면에서만 본문 번역을 쓴다(없거나 검사에 걸리면 원문). whole 이면 조각 나눔 없이 글 하나를, 아니면 비고를 번역한다.
// 상황 글은 [확정]·(확인 M/D) 를 떼고 몸말만 번역표에서 찾는다(watchMeta 와 같은 규칙).
export function noteText(text, whole) {
  if (!whole) return trNote(text);
  var r = trWhole(text);
  if (r !== text) return r;
  var body = watchMeta(text).body;
  return body !== text ? trWhole(body) : r;
}
export function splitNote(text) {
  var body = String(text == null ? "" : text).trim(), src = null, cross = null, m = STAMP_RE.exec(body);
  // 괄호 모양은 여기서 본다. 숫자 해석과 범위 확인은 format.js parseStamp 가 한다(stampOf 와 같은 규칙).
  var p = m && parseStamp(m[2] + "/" + m[3] + " " + m[4] + ":" + m[5] + " " + m[6]);
  if (p) {
    // 연도는 날짜 계산에만 쓴다(윤년이 있는 해로 두어 2/29 도 받는다). p.min 은 한국 시간 분이라 날짜가 넘어가도 맞는다.
    var d = new Date(Date.UTC(2024, p.mon - 1, p.day) + p.min * 6e4), h = d.getUTCHours(), mm = d.getUTCMinutes();
    src = { name: m[1], when: dateWord(d) + " " + clockText(h, mm) };
    body = body.slice(0, m.index);
  }
  if ((m = CROSS_RE.exec(body))) {
    cross = m[1].split(/,\s*/).filter(Boolean);
    body = (body.slice(0, m.index) + " " + body.slice(m.index + m[0].length)).replace(/\s{2,}/g, " ").trim();
  }
  return { body: body.trim(), src: src, cross: cross };
}

// 출처 줄: 떼어 낸 원보도·교차 확인과 출처 링크. 아무것도 없으면 빈 문자열.
export function srcsHTML(parts, src) {
  var out = [], link = srcHTML(src).trim();
  if (parts.src) out.push('<span class="stamp"><b>' + t("src.reported") + "</b> " + textHTML(parts.src.name) + " <time>" + esc(parts.src.when) + "</time></span>");
  if (parts.cross) out.push('<span class="cross"><b>' + t("src.cross") + "</b> " + parts.cross.map(function (x) { return textHTML(x); }).join(", ") + "</span>");
  if (link) out.push("<span>" + link + "</span>");
  return out.length ? '<p class="srcs">' + out.join("") + "</p>" : "";
}

// 정보 칸. 사람·팀마다 칸 수가 같도록 값이 없으면 "미공개" 를 흐리게 보여 준다. 값은 이미 이스케이프된 HTML.
export function infoHTML(pairs) {
  return '<dl class="dp-info c' + pairs.length + '">' + pairs.map(function (p) {
    return "<div><dt>" + esc(p[0]) + "</dt>" + (p[1] ? "<dd>" + p[1] + "</dd>" : '<dd class="na">' + t("label.undisclosed") + "</dd>") + "</div>";
  }).join("") + "</dl>";
}

// 상세 머리의 모노그램: 이름 첫 두 글자.
export function monoHTML(name) {
  return '<span class="mono" aria-hidden="true">' + esc(Array.from(String(name || "?")).slice(0, 2).join("")) + "</span>";
}

// 소식 한 줄. withName 이면 인물 이름을 링크로 함께 보여 준다(팀 화면). 지켜볼 팀 줄은 대상과 메모를 보여 준다.
export function newsRow(e, withName) {
  var it = e.item, sp = splitNote(noteText(val(it.note), e.kind === "watch")), when = relDate(it.date) + (stampLabel(it) && !sp.src ? " " + stampLabel(it) : "");
  if (e.kind === "watch") {
    return '<li class="dp-row"><p class="dp-meta">' + [when, esc(tabName("watch")), textHTML(trWhole(it.team))].filter(Boolean).join(" · ") + '</p><p class="dp-line"><span class="lbl">' + t("row.target") + "</span>" + termHTML(it.name) +
      (sp.body ? ". " + textHTML(sp.body) : "") + "</p>" + srcsHTML(sp, it.src) + "</li>";
  }
  // 소식 머리의 경로: 이동이면 "출발 → 도착"(잔류는 "X 잔류"), 아니면 소속 팀. 글자만 쓴다(링크는 줄 안의 이름 링크와 겹치지 않게 뺌).
  var r = routeOf(it), route = r && r.kind === "stay" ? textHTML(r.to) + " " + t("pill.stayed") : r ? [r.from, r.to].filter(Boolean).map(function (x) { return textHTML(x); }).join(" → ") : textHTML(trWhole(val(it.team)));
  return '<li class="dp-row"><p class="dp-meta">' + [when, esc(tabName(e.kind)), route].filter(Boolean).join(" · ") + "</p>" +
    '<p class="dp-line">' + pill(pillOf(it)) + badge(it) + (withName ? " " + nameLink(it.pid, nameHTML(it.name)) : "") + (sp.body ? " " + textHTML(sp.body) : "") + "</p>" + srcsHTML(sp, it.src) + "</li>";
}
