// 화면 상태, #탭 주소, 정렬 기억(localStorage "vct-order").
import { ID_RE } from "./model.js";

export var state = { tab: "players", region: "all", status: "all", q: "", order: "team" };

try { if (localStorage.getItem("vct-order") === "recent") state.order = "recent"; } catch (e) {}

export function saveOrder(order) {
  state.order = order;
  try { localStorage.setItem("vct-order", order); } catch (e) {}
}

// 사이트 루트 경로(이 파일 js/state.js 기준). 배포는 "/VCT-board/", 루트로 열면 "/".
// 상세 주소로 pushState 하면 상대 경로의 기준이 바뀌므로 사이트 안 주소는 항상 BASE 로 시작하는 절대 경로로 만든다.
export var BASE = new URL("../", import.meta.url).pathname;
export function personUrl(id) { return BASE + "p/" + id + "/"; }
export function teamUrl(id) { return BASE + "t/" + id + "/"; }
export function listUrl(tab) { return BASE + "#" + tab; }

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
  return { view: "list", tab: (loc.hash || "").replace("#", "") };
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
  try {
    if (location.hash !== "#" + state.tab) history.pushState(null, "", "#" + state.tab);
  } catch (e) {
    try { location.hash = state.tab; } catch (e2) {}
  }
}
