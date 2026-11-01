import { esc, relDate, srcHTML, stampLabel } from "../format.js";
import { pillOf } from "../model.js";
import { pill } from "../components/pill.js";
import { badge } from "../components/badge.js";
import { personUrl } from "../state.js";

// 상세 화면이 함께 쓰는 값과 줄 모양. person.js 와 team.js 가 가져다 쓴다.
// 소식 줄 앞에 붙는 탭 이름. 이적 행은 선수·코치 구분 없이 "이적 완료" 탭에 모인다.
export var TAB_NAME = { player: "선수", coach: "코치·스태프", t: "이적 완료", watch: "지켜볼 팀" };

// 빈 칸과 "-" 는 보여 주지 않는다.
export function val(v) { return v && v !== "-" ? v : ""; }

// 인물 이름. pid 가 없으면 링크 없이 글자만 둔다.
export function nameLink(pid, text) {
  return pid ? '<a href="' + esc(personUrl(pid)) + '">' + esc(text) + "</a>" : esc(text);
}

// 비고 글에서 원자료를 떼어 낸다. 데이터는 그대로 두고 화면에서만 나눈다.
// - 끝의 "(출처이름 M/D HH:mm UTC|KST)" → src {name, when}. when 은 한국 시간 "M/D 오전 h:mm".
// - "교차 확인: A, B" 구절(다음 마침표 또는 끝까지) → cross [A, B].
// 규칙에 맞지 않는 부분은 body 에 원문 그대로 남는다.
var STAMP_RE = /\s*\(([^()]+?)\s+(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(UTC|KST)\)\s*$/;
var CROSS_RE = /\s*교차 확인:\s*(.+?)(?:\.(?=\s|$)|$)/;
export function splitNote(text) {
  var body = String(text == null ? "" : text).trim(), src = null, cross = null, m = STAMP_RE.exec(body);
  if (m && +m[2] >= 1 && +m[2] <= 12 && +m[4] < 24 && +m[5] < 60) {
    // 연도는 날짜 계산에만 쓴다(윤년이 있는 해로 두어 2/29 도 받는다). 보도 시각 환산은 format.js stampOf 와 같이 UTC+9.
    var d = new Date(Date.UTC(2024, +m[2] - 1, +m[3], +m[4], +m[5]) + (m[6] === "UTC" ? 9 * 36e5 : 0)), h = d.getUTCHours(), mm = d.getUTCMinutes();
    src = { name: m[1], when: (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + " " + (h < 12 ? "오전 " : "오후 ") + (h % 12 || 12) + ":" + (mm < 10 ? "0" : "") + mm };
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
  if (parts.src) out.push('<span class="stamp"><b>보도</b> ' + esc(parts.src.name) + " <time>" + esc(parts.src.when) + "</time></span>");
  if (parts.cross) out.push('<span class="cross"><b>교차 확인</b> ' + parts.cross.map(esc).join(", ") + "</span>");
  if (link) out.push("<span>" + link + "</span>");
  return out.length ? '<p class="srcs">' + out.join("") + "</p>" : "";
}

// 정보 칸. 사람·팀마다 칸 수가 같도록 값이 없으면 "미공개" 를 흐리게 보여 준다. 값은 이미 이스케이프된 HTML.
export function infoHTML(pairs) {
  return '<dl class="dp-info c' + pairs.length + '">' + pairs.map(function (p) {
    return "<div><dt>" + esc(p[0]) + "</dt>" + (p[1] ? "<dd>" + p[1] + "</dd>" : '<dd class="na">미공개</dd>') + "</div>";
  }).join("") + "</dl>";
}

// 상세 머리의 모노그램: 이름 첫 두 글자.
export function monoHTML(name) {
  return '<span class="mono" aria-hidden="true">' + esc(Array.from(String(name || "?")).slice(0, 2).join("")) + "</span>";
}

// 소식 한 줄. withName 이면 인물 이름을 링크로 함께 보여 준다(팀 화면). 지켜볼 팀 줄은 대상과 메모를 보여 준다.
export function newsRow(e, withName) {
  var it = e.item, when = relDate(it.date) + (stampLabel(it) ? " " + stampLabel(it) : ""), sp = splitNote(val(it.note));
  if (e.kind === "watch") {
    return '<li class="dp-row"><p class="dp-meta">' + [when, esc(TAB_NAME.watch), esc(it.team)].filter(Boolean).join(" · ") + '</p><p class="dp-line"><span class="lbl">대상</span>' + esc(it.name) +
      (sp.body ? ". " + esc(sp.body) : "") + "</p>" + srcsHTML(sp, it.src) + "</li>";
  }
  var route = e.kind === "t" ? [val(it.team), val(it.next)].filter(Boolean).join(" → ") : val(it.team);
  return '<li class="dp-row"><p class="dp-meta">' + [when, esc(TAB_NAME[e.kind]), esc(route)].filter(Boolean).join(" · ") + "</p>" +
    '<p class="dp-line">' + pill(pillOf(it)) + badge(it) + (withName ? " " + nameLink(it.pid, it.name) : "") + (sp.body ? " " + esc(sp.body) : "") + "</p>" + srcsHTML(sp, it.src) + "</li>";
}
