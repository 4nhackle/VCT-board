import { esc } from "../format.js";
import { pillText } from "../model.js";

// p = pillOf(it) 의 [분류, 문구, 단계, 짧은 문구]. 짧은 문구가 있으면 그것을 쓴다(팀 이름은 경로 줄이 보여 준다).
// 단계가 reported(합류 보도)이면 점선 모양을 덧붙인다.
export function pill(p) {
  return '<span class="pill ' + p[0] + (p[2] === "reported" ? " reported" : "") + '">' + esc(p[3] || pillText(p)) + "</span>";
}
