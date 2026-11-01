import { esc } from "../format.js";
import { teamUrl } from "../state.js";

// 팀 이름: ID 가 있으면 링크, 없으면 글자만. 출발 팀이 없으면 "소속 없음".
function teamPart(cls, name, id) {
  var text = name || "소속 없음";
  return id ? '<a class="' + cls + '" href="' + esc(teamUrl(id)) + '">' + esc(text) + "</a>" : '<span class="' + cls + '">' + esc(text) + "</span>";
}

// 이동 경로 줄. "A 에서 B 로" 를 "A → B" 로 보여 준다. 스크린 리더는 "A에서 B로" 로 읽는다.
// 잔류(stay)는 한 팀만 쓰고 "잔류" 태그를 붙인다. opt.noFrom 이면 출발 팀을 뺀 "→ B" 만 그린다.
export function routeHTML(r, opt) {
  opt = opt || {};
  var arrow = '<span class="r-arrow" aria-hidden="true">→</span>';
  if (r.kind === "stay") return '<span class="route stay">' + teamPart("r-from", r.to, r.toId) + ' <span class="r-tag">잔류</span></span>';
  if (opt.noFrom) return '<span class="route"><span class="r-next">' + arrow + " " + teamPart("r-to", r.to, r.toId) + '<span class="sr">로</span></span></span>';
  return '<span class="route">' + teamPart("r-from", r.from, r.fromId) +
    '<span class="r-next"><span class="sr">에서</span>' + arrow + " " + teamPart("r-to", r.to, r.toId) + '<span class="sr">로</span></span></span>';
}
