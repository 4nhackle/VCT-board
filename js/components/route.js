import { esc, textHTML } from "../format.js";
import { teamUrl } from "../state.js";
import { t } from "../i18n.js";

// 팀 이름: ID 가 있으면 링크, 없으면 글자만. 출발 팀이 없으면 "소속 없음". 한글이 든 팀 이름은 영문 화면에서 원문 + KR.
function teamPart(cls, name, id) {
  var text = name || t("team.noTeam"), html = textHTML(text);
  return id ? '<a class="' + cls + '" href="' + esc(teamUrl(id)) + '">' + html + "</a>" : '<span class="' + cls + '">' + html + "</span>";
}

// 이동 경로 줄. 보이는 글은 "A → B" 이고, 화면낭독기에는 문장 틀(사전 route.full, route.toOnly)로 읽힌다.
// 틀의 {from}·{to}·{arrow} 자리에 팀 글을 넣는다. 한국어 "A에서 B로", 영문 "from A to B" 순서를 사전이 정한다.
// 잔류(stay)는 한 팀만 쓰고 "잔류" 태그를 붙인다. opt.noFrom 이면 출발 팀을 뺀 "→ B" 만 그린다.
export function routeHTML(r, opt) {
  opt = opt || {};
  var arrow = '<span class="r-arrow" aria-hidden="true">→</span>';
  if (r.kind === "stay") return '<span class="route stay">' + teamPart("r-from", r.to, r.toId) + ' <span class="r-tag">' + t("route.stayed") + "</span></span>";
  if (opt.noFrom) return '<span class="route">' + t("route.toOnly", { arrow: arrow, to: teamPart("r-to", r.to, r.toId) }) + "</span>";
  return '<span class="route">' + t("route.full", { from: teamPart("r-from", r.from, r.fromId), arrow: arrow, to: teamPart("r-to", r.to, r.toId) }) + "</span>";
}
