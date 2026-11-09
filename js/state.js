// 화면 상태, #탭 주소.
import { ID_RE } from "./model.js";
import { LANG } from "./i18n.js";

export var state = { tab: "players", region: "all", status: "all", q: "", pos: "all", days: "all", top: false, order: "team" };

// 데이터와 화면 기록(main·render·chrome 이 함께 쓴다). 지금 화면(list, person, team, notfound)과, 상세로 오기 직전이 목록이었는지.
export var app = { D: {}, TABS: [], IDX: { people: Object.create(null), teams: Object.create(null), byPerson: Object.create(null), byTeam: Object.create(null) }, view: "", fromList: false };
export function tabById(id) { return app.TABS.filter(function (t) { return t.id === id; })[0]; }

// 버튼 한 번이 상태를 바꾸는 규칙(화면은 그리지 않는다). 바꾼 뒤 { tabChanged, filterChanged }, 상태 단추가 아니면 null.
// data 는 버튼의 dataset. data.top(맨 위로)은 화면 쪽에서 처리하므로 여기서 다루지 않는다.
export function applyButton(state, data) {
  var tabChanged = false, filterChanged = false;
  if (data.tab) { tabChanged = data.tab !== state.tab; state.tab = data.tab; }
  else if (data.region) state.region = data.region;
  else if (data.status) state.status = data.status;
  else if (data.partner) { state.top = !state.top; filterChanged = true; }
  else if (data.order) { state.order = state.order === "recent" ? "team" : "recent"; filterChanged = true; }
  else return null;
  return { tabChanged: tabChanged, filterChanged: filterChanged };
}

// 새 거르기(포지션·기간·VCT 파트너팀)와 정렬. 주소의 ?pos=…&days=…&vct=1&sort=recent 로 쓰고, 값이 기본이면 쓰지 않는다.
// 옛 주소의 stage=… 는 읽지 않아 무시되고, 거르기를 바꾸면 syncHash 가 주소에서 지운다.
export var POS_VALUES = ["all", "Duelist", "Initiator", "Controller", "Sentinel", "Flex", "IGL"];
var DAY_VALUES = ["all", "0", "3", "7"];
export function filtersOf(loc) {
  var q = new URLSearchParams(String((loc.hash || "").split("?")[1] || "")), f = { pos: "all", days: "all", top: false, order: "team" };
  if (POS_VALUES.indexOf(q.get("pos")) >= 0) f.pos = q.get("pos");
  if (DAY_VALUES.indexOf(q.get("days")) >= 0) f.days = q.get("days");
  f.top = q.get("vct") === "1" || q.get("top") === "1"; // 옛 주소 top=1 도 받는다(VCT 파트너팀)
  f.order = q.get("sort") === "recent" ? "recent" : "team"; // 최근 소식순(sort=recent). 그 밖의 값은 팀별
  return f;
}
export function queryOf(s) {
  var p = [];
  if (s.pos && s.pos !== "all") p.push("pos=" + encodeURIComponent(s.pos));
  if (s.days && s.days !== "all") p.push("days=" + s.days);
  if (s.top) p.push("vct=1");
  if (s.order === "recent") p.push("sort=recent");
  return p.length ? "?" + p.join("&") : "";
}

// 목록 주소로 왔을 때 할 일: "none"(그대로), "refilter"(같은 탭, 주소의 거르기만 바뀜), "full"(탭 전환·상세에서 복귀).
export function listAction(view, curTab, nextTab, tabExists, cur, next) {
  if (view !== "list" || (nextTab !== curTab && tabExists)) return "full";
  if (nextTab !== curTab) return "none";
  return Object.keys(next).some(function (k) { return next[k] !== cur[k]; }) ? "refilter" : "none";
}

// 클릭 한 번이 무엇을 할지 고른다. 순서가 뜻을 가진다: 행 안의 링크는 링크지 행 펼침이 아니다.
export function clickAction(target) {
  var a = target.closest("a[href]");
  if (a) return { kind: "link", el: a };
  var row = target.closest("li.row");
  if (row && row.querySelector(":scope > .row-x") && (target.closest(".row-x") || !target.closest("button, select, input, .row-fold"))) return { kind: "row", el: row };
  var b = target.closest("button");
  return b ? { kind: "button", el: b } : null;
}

// 사이트 루트 경로(이 파일 js/state.js 기준). 배포는 "/VCT-board/", 루트로 열면 "/".
// 상세 주소로 pushState 하면 상대 경로의 기준이 바뀌므로 사이트 안 주소는 항상 BASE 로 시작하는 절대 경로로 만든다.
export var BASE = new URL("../", import.meta.url).pathname;
// 주소의 기준. 영문 화면의 사이트 안 주소는 BASE 뒤에 en/ 이 붙는다(예: /VCT-board/en/p/oxy/). 한국어는 BASE 그대로.
export var ROUTE_BASE = BASE + (LANG === "en" ? "en/" : "");
export function personUrl(id) { return ROUTE_BASE + "p/" + id + "/"; }
export function teamUrl(id) { return ROUTE_BASE + "t/" + id + "/"; }
export function listUrl(tab) { return ROUTE_BASE + "#" + tab; }

// 주소 → 화면. base + "p/<id>/" 는 인물, base + "t/<id>/" 는 팀, 그 외는 목록(#탭). 끝 슬래시는 없어도 된다.
// p/·t/ 아래인데 id 가 형식에 맞지 않거나 경로가 더 깊으면 {view: "notfound"}. node 에서 시험할 수 있게 loc·base 를 인자로 받는다.
export function parseRoute(loc, base) {
  var path = loc.pathname || "";
  if (path.indexOf(base) === 0) {
    var rest = path.slice(base.length), m = /^([pt])\/([^/]+)\/?$/.exec(rest);
    if (m) {
      var id = "";
      try { id = decodeURIComponent(m[2]); } catch (e) {}
      if (ID_RE.test(id)) return { view: m[1] === "p" ? "person" : "team", id: id };
      return { view: "notfound" };
    }
    if (/^[pt]\//.test(rest)) return { view: "notfound" };
  }
  // 목록 주소의 탭 이름. ?뒤의 거르기 값은 filtersOf 가 읽는다.
  return { view: "list", tab: (loc.hash || "").replace("#", "").split("?")[0] };
}

// 사이트 안 이동. 주소를 바꾸고 popstate 를 보내 main.js 가 뒤로·앞으로와 같은 길로 다시 그리게 한다.
export function go(url) {
  try {
    history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  } catch (e) {
    location.href = url;
  }
}

// 탭을 바꾸면 주소 뒤의 #탭이름도 바꾼다. 그래야 탭 링크를 공유하고 뒤로 가기를 쓸 수 있다.
export function pushTab() {
  var h = "#" + state.tab + queryOf(state);
  try {
    if (location.hash !== h) history.pushState(null, "", h);
  } catch (e) {
    try { location.hash = h; } catch (e2) {}
  }
}
