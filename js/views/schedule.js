import { esc, fmtDate, TODAY } from "../format.js";

// 일정 칸의 날짜(일련번호나 "11/5–11/8", "2027-01-14 ~ 02-07" 같은 글)에서 시작일과 끝일을 뽑는다.
// 연도가 없으면 기준일(today, 기본 TODAY)에 가장 가까운 해로 본다. 시험할 때 기준일을 넣는다.
export function spanOf(v, today) {
  var t = today == null ? TODAY : today;
  if (typeof v === "number") return [v, v];
  var re = /(?:(\d{4})-)?(\d{1,2})[\/-](\d{1,2})/g, m, y = null, out = [];
  var base = new Date(Date.UTC(1899, 11, 30) + t * 864e5).getUTCFullYear();
  while ((m = re.exec(String(v)))) {
    if (m[1]) y = +m[1];
    var best = null;
    (y ? [y] : [base - 1, base, base + 1]).forEach(function (yy) {
      var s = Math.round((Date.UTC(yy, +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5);
      if (best === null || Math.abs(s - t) < Math.abs(best - t)) best = s;
    });
    out.push(best);
  }
  if (!out.length) return null;
  return [Math.min.apply(null, out), Math.max.apply(null, out)];
}

// 시작일 순, 같으면 끝일 순, 그다음 원래 순서. 날짜를 못 읽은 행은 맨 뒤에 원래 순서로 둔다.
export function sortSchedule(rows, today) {
  return rows.map(function (r, i) { return { r: r, i: i, sp: spanOf(r.date, today) }; }).sort(function (a, b) {
    if (!a.sp && !b.sp) return a.i - b.i;
    if (!a.sp) return 1;
    if (!b.sp) return -1;
    return a.sp[0] - b.sp[0] || a.sp[1] - b.sp[1] || a.i - b.i;
  }).map(function (k) { return k.r; });
}

function ddHTML(sp) {
  if (!sp) return "";
  var a = sp[0] - TODAY, b = sp[1] - TODAY;
  if (b < 0) return '<span class="dd">끝남</span>';
  if (a <= 0) return '<span class="dd now">' + (sp[0] === sp[1] ? "오늘" : "진행 중") + "</span>";
  return '<span class="dd' + (a <= 7 ? " soon" : "") + '">D-' + a + "</span>";
}
export function scheduleHTML(rows) {
  return '<ul class="list">' + sortSchedule(rows).map(function (r) {
    var sp = spanOf(r.date);
    return '<li class="row sch' + (sp && sp[1] < TODAY ? " past" : "") + '"><span class="when">' + fmtDate(r.date) + ddHTML(sp) + '</span><p class="detail">' + esc(r.title) + ' <span class="src">(' + esc(r.source) + ")</span></p></li>";
  }).join("") + "</ul>";
}
