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

// 소식 한 줄. withName 이면 인물 이름을 링크로 함께 보여 준다(팀 화면). 지켜볼 팀 줄은 대상과 메모를 보여 준다.
export function newsRow(e, withName) {
  var it = e.item, when = relDate(it.date) + (stampLabel(it) ? " " + stampLabel(it) : "");
  if (e.kind === "watch") {
    return '<li class="dp-row"><p class="dp-meta">' + [when, esc(TAB_NAME.watch), esc(it.team)].filter(Boolean).join(" · ") + '</p><p class="dp-line">대상: ' + esc(it.name) +
      (val(it.note) ? ". " + esc(it.note) : "") + srcHTML(it.src) + "</p></li>";
  }
  var route = e.kind === "t" ? [val(it.team), val(it.next)].filter(Boolean).join(" → ") : val(it.team);
  return '<li class="dp-row"><p class="dp-meta">' + [when, esc(TAB_NAME[e.kind]), esc(route)].filter(Boolean).join(" · ") + "</p>" +
    '<p class="dp-line">' + pill(pillOf(it)) + badge(it) + (withName ? " " + nameLink(it.pid, it.name) : "") + (val(it.note) ? " " + esc(it.note) : "") + srcHTML(it.src) + "</p></li>";
}
