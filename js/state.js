// 화면 상태, #탭 주소, 정렬 기억(localStorage "vct-order").
import { ID_RE } from "./model.js";
import { LANG } from "./i18n.js";

export var state = { tab: "players", region: "all", status: "all", q: "", order: "team", pos: "all", stage: "all", days: "all", top: false };

// 새 거르기(포지션·확인 단계·기간·상위 팀). 주소의 ?pos=…&stage=…&days=…&top=1 로 쓰고, 값이 기본이면 쓰지 않는다.
export var POS_VALUES = ["all", "Duelist", "Initiator", "Controller", "Sentinel", "Flex", "IGL"];
export var STAGE_VALUES = ["all", "confirmed", "reported"];
export var DAY_VALUES = ["all", "0", "3", "7"];
export function filtersOf(loc) {
  var q = new URLSearchParams(String((loc.hash || "").split("?")[1] || "")), f = { pos: "all", stage: "all", days: "all", top: false };
  if (POS_VALUES.indexOf(q.get("pos")) >= 0) f.pos = q.get("pos");
  if (STAGE_VALUES.indexOf(q.get("stage")) >= 0) f.stage = q.get("stage");
  if (DAY_VALUES.indexOf(q.get("days")) >= 0) f.days = q.get("days");
  f.top = q.get("top") === "1";
  return f;
}
export function queryOf(s) {
  var p = [];
  if (s.pos && s.pos !== "all") p.push("pos=" + encodeURIComponent(s.pos));
  if (s.stage && s.stage !== "all") p.push("stage=" + s.stage);
  if (s.days && s.days !== "all") p.push("days=" + s.days);
  if (s.top) p.push("top=1");
  return p.length ? "?" + p.join("&") : "";
}

// 목록 주소로 왔을 때 할 일: "none"(그대로), "refilter"(같은 탭, 주소의 거르기만 바뀜), "full"(탭 전환·상세에서 복귀).
export function listAction(view, curTab, nextTab, tabExists, cur, next) {
  if (view !== "list" || (nextTab !== curTab && tabExists)) return "full";
  if (nextTab !== curTab) return "none";
  return Object.keys(next).some(function (k) { return next[k] !== cur[k]; }) ? "refilter" : "none";
}

try { if (localStorage.getItem("vct-order") === "recent") state.order = "recent"; } catch (e) {}

export function saveOrder(order) {
  state.order = order;
  try { localStorage.setItem("vct-order", order); } catch (e) {}
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
