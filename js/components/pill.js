import { esc } from "../format.js";

// p = pillOf(it) 의 [분류, 문구]
export function pill(p) {
  return '<span class="pill ' + p[0] + '">' + esc(p[1]) + "</span>";
}
