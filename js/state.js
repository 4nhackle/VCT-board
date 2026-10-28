// 화면 상태, #탭 주소, 정렬 기억(localStorage "vct-order").
export var state = { tab: "players", region: "all", status: "all", q: "", order: "team" };

try { if (localStorage.getItem("vct-order") === "recent") state.order = "recent"; } catch (e) {}

export function saveOrder(order) {
  state.order = order;
  try { localStorage.setItem("vct-order", order); } catch (e) {}
}

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
