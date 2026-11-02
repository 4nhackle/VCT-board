// 데이터 문구(상태·이적 구분·역할·지켜볼 팀 대상)를 영문 용어집으로 옮긴다. 자유 번역이 아니다: 정해진 짝(TERMS)과 규칙(RULES)만 쓴다.
// 조각(" · ", " / ", ", ", "/" 로 나눈 것)마다 옮기고, 조각 하나라도 한글이 남으면 문구 전체를 null 로 돌려준다(반쪽 번역 금지).
// 한글이 없는 글(팀 이름, LFT·FA, 숫자)은 그대로 돌려준다. 판정 정규식(model.js)은 한국어 원문을 그대로 읽고, 이 파일은 화면 글자만 만든다.
var HANGUL = /[가-힣]/;
var SEPS = [" · ", " / ", ", ", "/"];
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 정확히 같은 조각의 짝.
var TERMS = {
  "이적": "Transfer", "잔류": "Stayed", "재계약": "re-signed", "복귀": "return",
  "방출": "Released", "결별": "Parted ways", "팀 이탈": "Left team", "이탈": "Left team", "팀 이탈(예정)": "Leaving team (upcoming)",
  "탐색 허가": "Free to explore", "FA 진입 예정": "Entering FA (upcoming)", "FA 탐색": "Exploring FA", "FA 선언": "Declared FA",
  "제한적 FA": "Restricted FA", "LFT 게시": "Posted LFT", "LFT 선언": "Declared LFT", "구직": "Looking for team",
  "구두 합의 보도": "Verbal agreement reported", "공식 결별 발표": "Departure announced", "공식 발표": "officially announced",
  "헤드 코치": "Head Coach", "어시스턴트 코치": "Assistant Coach", "코치": "Coach", "퍼포먼스 코치": "Performance Coach",
  "애널리스트": "Analyst", "선수": "Player", "보조": "secondary", "보조 콜러": "secondary caller", "콜러": "caller",
  "소속 선수": "Team players", "소속 선수 전원": "All team players",
  "계약 중": "under contract", "계약 만료 임박": "contract expiring soon", "계약 해지": "contract terminated",
  "본인 확인": "self-confirmed", "본인 발표": "self-announced", "비활성 로스터": "inactive roster", "비활성": "inactive",
  "전 지역 오픈": "open in all regions", "전 포지션 가능": "any position", "협상 가능": "Open to talks", "오퍼 수용": "offer accepted",
  "새 팀 미발표": "no new team announced", "로스터 전원": "entire roster", "무제한 FA": "unlimited FA", "미확정": "unconfirmed",
  "예정": "upcoming", "전원": "all"
};

// 규칙: [정규식, 함수]. 함수는 영문을 돌려주고, 맞지 않으면 null 을 돌려준다(다음 규칙을 본다).
// 괄호 안은 같은 방법으로 옮긴다. 팀 이름이 앞에 와도 글자를 바꾸지 않도록 첫 글자는 그대로 둔다.
function tx(s) { return termEn(s); }
function inner(s) { return termEn(s); }
function plain(s) { return HANGUL.test(s) ? null : s; }
// "11/2" → "Nov 2". 달이나 날이 범위 밖이면 null.
function monthDay(s) {
  var p = s.split("/"), m = +p[0], d = +p[1];
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? MONTHS[m - 1] + " " + d : null;
}
// 앞글 + 옮긴 가운데 + 뒤글. 가운데가 null 이면 null.
function wrap(pre, mid, post) { return mid === null ? null : pre + mid + post; }

var RULES = [
  [/^계약 완료\((.+) 잔류\)$/, function (m) { return wrap("Re-signed with ", tx(m[1]), ""); }],
  [/^계약 완료\((.+)\) 구두 합의 보도$/, function (m) { return wrap("Signed with ", tx(m[1]), " · Verbal agreement reported"); }],
  [/^계약 완료\((.+)\)$/, function (m) { return wrap("Signed with ", tx(m[1]), ""); }],
  [/^팀 이탈\((.+)\)$/, function (m) { return wrap("Left team (", inner(m[1]), ")"); }],
  [/^(.+?) 이탈\((.+)\)$/, function (m) { return plain(m[1]) === null ? null : wrap("Left " + m[1] + " (", inner(m[2]), ")"); }],
  [/^(.+?) 이탈$/, function (m) { return plain(m[1]) === null ? null : "Left " + m[1]; }],
  [/^이탈 보도\((.+)\)$/, function (m) { return wrap("Departure reported (", inner(m[1]), ")"); }],
  [/^(.+?) 공식 결별 발표$/, function (m) { return plain(m[1]) === null ? null : m[1] + " announced departure"; }],
  [/^(.+) 공식 발표$/, function (m) { return wrap("", tx(m[1]), " officially announced"); }],
  [/^방출\((.+)\)$/, function (m) { return wrap("Released (", inner(m[1]), ")"); }],
  [/^(.+?) 철수 확정$/, function (m) { return plain(m[1]) === null ? null : m[1] + " exit confirmed"; }],
  [/^FA 탐색\((.+)\)$/, function (m) { return wrap("Exploring FA (", inner(m[1]), ")"); }],
  [/^FA 선언\((.+)\)$/, function (m) { return wrap("Declared FA (", inner(m[1]), ")"); }],
  [/^탐색 허가\((.+)\)$/, function (m) { return wrap("Free to explore (", inner(m[1]), ")"); }],
  [/^제한적 FA\((.+)\)$/, function (m) { return wrap("Restricted FA (", inner(m[1]), ")"); }],
  [/^LFT 선언\((.+)\)$/, function (m) { return wrap("Declared LFT (", inner(m[1]), ")"); }],
  [/^(.+?) 합류 임박\(보도\)$/, function (m) { return plain(m[1]) === null ? null : "Reported to join " + m[1] + " soon"; }],
  [/^(.+?) 합류 보도$/, function (m) { return plain(m[1]) === null ? null : "Reported to join " + m[1]; }],
  [/^이적\((.+)\)$/, function (m) { return wrap("Transfer (", inner(m[1]), ")"); }],
  [/^잔류\((.+)\)$/, function (m) { return wrap("Stayed (", inner(m[1]), ")"); }],
  [/^(.+)\(예정\)$/, function (m) { return wrap("", tx(m[1]), " (incoming)"); }],
  [/^보조 (.+)$/, function (m) { return plain(m[1]) === null ? null : "secondary " + m[1]; }],
  [/^코치 (.+)$/, function (m) { return plain(m[1]) === null ? null : "Coach " + m[1]; }],
  [/^선수 전원\((.+)\)$/, function (m) { return wrap("All players (", inner(m[1]), ")"); }],
  [/^(.+) 제외 별도 표기$/, function (m) { return wrap("", tx(m[1]), " listed separately"); }],
  [/^(.+?)은 LFT 시트에 반영$/, function (m) { return wrap("", tx(m[1]), " reflected on LFT sheet"); }],
  [/^계약 (\d{4})까지$/, function (m) { return "contract through " + m[1]; }],
  [/^계약 (\d{1,2}\/\d{1,2}) 만료$/, function (m) { var d = monthDay(m[1]); return d === null ? null : "contract ends " + d; }],
  // 영문 머리에 괄호가 붙은 꼴: "Controller(보조)", "Initiator (IGL/보조 콜러)", "LFT(계약 중)", "FNS(코치)"
  [/^([A-Za-z][A-Za-z0-9 ]*?) ?\((.+)\)$/, function (m) { return wrap(m[1] + " (", inner(m[2]), ")"); }]
];

// 한글이 없어도 옮기는 꼴: "FA(11/2)" 는 한국어 상태 글의 약어와 날짜다.
var ASCII_RULES = [
  [/^FA\((\d{1,2}\/\d{1,2})\)$/, function (m) { var d = monthDay(m[1]); return d === null ? null : "Free agent from " + d; }]
];

function runRules(list, p) {
  for (var i = 0; i < list.length; i++) {
    var m = list[i][0].exec(p);
    if (m) { var r = list[i][1](m); if (r !== null) return r; }
  }
  return null;
}

function translatePiece(p) {
  var asc = runRules(ASCII_RULES, p);
  if (asc !== null) return asc;
  if (!HANGUL.test(p)) return p;
  if (Object.prototype.hasOwnProperty.call(TERMS, p)) return TERMS[p];
  return runRules(RULES, p);
}

// 괄호 밖의 구분자로만 나눈다. 괄호 안의 구분자는 한 덩이로 두고, 날짜 "11/2" 의 "/" 는 나누지 않는다.
function splitTop(s) {
  var out = [], depth = 0, start = 0;
  for (var i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (depth === 0) {
      var sep = SEPS.filter(function (x) { return s.substr(i, x.length) === x; })[0];
      if (sep === "/" && /\d/.test(s[i - 1] || "") && /\d/.test(s[i + 1] || "")) sep = undefined;
      if (sep) { out.push({ text: s.slice(start, i), sep: sep }); i += sep.length - 1; start = i + 1; }
    }
  }
  out.push({ text: s.slice(start), sep: "" });
  return out;
}

// 문구 하나를 영문으로. 한글이 없으면 그대로, 옮길 수 없는 조각이 있으면 null.
export function termEn(text) {
  var s = String(text == null ? "" : text).trim();
  var out = "", pieces = splitTop(s);
  for (var i = 0; i < pieces.length; i++) {
    var en = translatePiece(pieces[i].text.trim());
    if (en === null) return null;
    out += en + pieces[i].sep;
  }
  return out;
}
