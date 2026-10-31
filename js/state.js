// 화면 상태, #탭 주소, 정렬 기억(localStorage "vct-order").
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

export function hashTab() {
  try { return (location.hash || "").replace("#", ""); } catch (e) { return ""; }
}

// 탭을 바꾸면 주소 뒤의 #탭이름도 바꾼다. 그래야 탭 링크를 공유하고 뒤로 가기를 쓸 수 있다.
export function pushTab() {
  try {
    if (location.hash !== "#" + state.tab) history.pushState(null, "", "#" + state.tab);
  } catch (e) {
    try { location.hash = state.tab; } catch (e2) {}
  }
}
