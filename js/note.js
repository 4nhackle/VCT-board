// 비고 글의 기계 판독 부분: 끝의 "(출처이름 M/D HH:mm UTC|KST)" 와 "교차 확인: A, B" 구절.
// 화면의 splitNote(views/common.js)와 번역 검사(i18n.js trEn)가 같은 정규식을 쓴다. 이 파일을 고치면 둘 다 바뀐다.
export var STAMP_RE = /\s*\(([^()]+?)\s+(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(UTC|KST)\)\s*$/;
export var CROSS_RE = /\s*교차 확인:\s*(.+?)(?:\.(?=\s|$)|$)/;

// 글을 몸말·출처 시각·교차 확인 목록으로 나눈다. 시각은 "name M/D HH:mm TZ" 꼴로 돌려준다(날짜 계산 없이 비교용).
export function noteParts(text) {
  var body = String(text == null ? "" : text).trim(), stamp = null, cross = null, m = STAMP_RE.exec(body);
  if (m) {
    stamp = [m[1], m[2], m[3], m[4], m[5], m[6]].join(" ");
    body = body.slice(0, m.index);
  }
  if ((m = CROSS_RE.exec(body))) {
    cross = m[1].split(/,\s*/).filter(Boolean);
    body = (body.slice(0, m.index) + " " + body.slice(m.index + m[0].length)).replace(/\s{2,}/g, " ").trim();
  }
  return { body: body.trim(), stamp: stamp, cross: cross };
}
