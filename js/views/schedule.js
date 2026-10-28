import { esc, fmtDate, TODAY } from "../format.js";

// 일정 칸의 날짜(일련번호나 "11/5–11/8", "2027-01-14 ~ 02-07" 같은 글)에서 시작일과 끝일을 뽑는다.
function spanOf(v) {
  if (typeof v === "number") return [v, v];
  var re = /(?:(\d{4})-)?(\d{1,2})[\/-](\d{1,2})/g, m, y = null, out = [];
  var base = new Date(Date.UTC(1899, 11, 30) + TODAY * 864e5).getUTCFullYear();
  while ((m = re.exec(String(v)))) {
    if (m[1]) y = +m[1];
    var best = null;
    (y ? [y] : [base - 1, base, base + 1]).forEach(function (yy) {
      var s = Math.round((Date.UTC(yy, +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5);
      if (best === null || Math.abs(s - TODAY) < Math.abs(best - TODAY)) best = s;
    });
    out.push(best);
  }
  if (!out.length) return null;
  return [Math.min.apply(null, out), Math.max.apply(null, out)];
}
function ddHTML(sp) {
  if (!sp) return "";
  var a = sp[0] - TODAY, b = sp[1] - TODAY;
  if (b < 0) return '<span class="dd">끝남</span>';
  if (a <= 0) return '<span class="dd now">' + (sp[0] === sp[1] ? "오늘" : "진행 중") + "</span>";
  return '<span class="dd' + (a <= 7 ? " soon" : "") + '">D-' + a + "</span>";
}
export function scheduleHTML(rows) {
  return '<ul class="list">' + rows.map(function (r) {
    var sp = spanOf(r.date);
    return '<li class="row sch' + (sp && sp[1] < TODAY ? " past" : "") + '"><span class="when">' + fmtDate(r.date) + ddHTML(sp) + '</span><p class="detail" style="color:var(--ink);font-size:15px">' + esc(r.title) + " <span style=\"color:var(--mute);font-size:13px\">(" + esc(r.source) + ")</span></p></li>";
  }).join("") + "</ul>";
}
