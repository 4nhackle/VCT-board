export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
export function fmtDate(n) {
  if (typeof n !== "number") return esc(n);
  var d = new Date(Date.UTC(1899, 11, 30) + n * 864e5);
  return (d.getUTCMonth() + 1) + "/" + d.getUTCDate();
}
// 오늘(한국 시간)을 시트와 같은 날짜 일련번호로. 최근 사흘(오늘·어제·그제) 보도를 새 소식으로 본다.
export var TODAY = Math.floor((Date.now() + 9 * 36e5) / 864e5) + 25569;
export function isNew(it) { return typeof it.date === "number" && TODAY - it.date >= 0 && TODAY - it.date <= 2; }
export function isoOf(n) { return new Date(Date.UTC(1899, 11, 30) + n * 864e5).toISOString().slice(0, 10); }
// 머리말 시각 뒤에 시간대(KST)를 붙인다. 이미 KST 가 있으면 그대로 둔다(예약 작업이 직접 써도 두 번 붙지 않는다).
export function withKst(text) {
  return String(text).replace(/(\d{4}-\d{2}-\d{2} \d{1,2}:\d{2})(?!\s*KST)(\s*기준)/, "$1 KST$2");
}
// 보도 시각 글 "M/D HH:mm UTC|KST" 를 읽는다. 월 1~12, 시 0~23, 분 0~59 가 아니면 null.
// min 은 그 날 0시부터의 한국 시간 분이다(UTC 표기는 +9시간). 하루를 넘으면 1440 이상이다. 날짜 칸과의 대조는 하지 않는다.
export function parseStamp(text) {
  var m = /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(UTC|KST)/.exec(String(text == null ? "" : text));
  if (!m) return null;
  var p = { mon: +m[1], day: +m[2], hh: +m[3], mm: +m[4], tz: m[5] };
  if (p.mon < 1 || p.mon > 12 || p.hh > 23 || p.mm > 59) return null;
  p.min = p.hh * 60 + p.mm + (p.tz === "UTC" ? 540 : 0);
  return p;
}
// 비고에 적힌 보도 시각("10/24 16:30 UTC" 또는 "... KST")을 한국 시간 기준 분 단위로. 없으면 null. 날짜 칸과 같은 날일 때만 준다.
export function stampOf(it) {
  if (it._st !== undefined) return it._st;
  var p = parseStamp(it.note), r = null;
  if (p && typeof it.date === "number") {
    var base = new Date(Date.UTC(1899, 11, 30) + it.date * 864e5).getUTCFullYear(), best = null;
    [base - 1, base, base + 1].forEach(function (yy) {
      var s = Math.round((Date.UTC(yy, p.mon - 1, p.day) - Date.UTC(1899, 11, 30)) / 864e5);
      if (best === null || Math.abs(s - it.date) < Math.abs(best - it.date)) best = s;
    });
    r = best * 1440 + p.min;
    if (Math.floor(r / 1440) !== it.date) r = null;
  }
  it._st = r;
  return r;
}
export function stampLabel(it) {
  var s = stampOf(it);
  if (s === null) return "";
  var mins = s % 1440, h = Math.floor(mins / 60), mm = mins % 60;
  return (h < 12 ? "오전 " : "오후 ") + (h % 12 || 12) + ":" + (mm < 10 ? "0" : "") + mm;
}
export function dayWord(n) {
  var d = TODAY - n;
  if (d === 0) return "오늘";
  if (d === 1) return "어제";
  if (d > 1 && d < 7) return d + "일 전";
  return fmtDate(n);
}
export function relDate(n) {
  if (typeof n !== "number") return esc(n);
  return '<time datetime="' + isoOf(n) + '" title="' + isoOf(n) + '">' + dayWord(n) + "</time>";
}
export function srcHTML(s) {
  if (!s) return "";
  return /^https?:\/\//i.test(s[1])
    ? '<a href="' + esc(s[1]) + '" target="_blank" rel="noopener">출처: ' + esc(s[0]) + "</a>"
    : " 출처: " + esc(s[0]);
}
