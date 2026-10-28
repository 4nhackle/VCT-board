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
// 비고에 적힌 보도 시각("10/24 16:30 UTC" 또는 "... KST")을 한국 시간 기준 분 단위로. 없으면 null.
export function stampOf(it) {
  if (it._st !== undefined) return it._st;
  var m = /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*(UTC|KST)/.exec(it.note || ""), r = null;
  if (m && typeof it.date === "number") {
    var base = new Date(Date.UTC(1899, 11, 30) + it.date * 864e5).getUTCFullYear(), best = null;
    [base - 1, base, base + 1].forEach(function (yy) {
      var s = Math.round((Date.UTC(yy, +m[1] - 1, +m[2]) - Date.UTC(1899, 11, 30)) / 864e5);
      if (best === null || Math.abs(s - it.date) < Math.abs(best - it.date)) best = s;
    });
    r = best * 1440 + (+m[3]) * 60 + (+m[4]) + (m[5] === "UTC" ? 540 : 0);
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
