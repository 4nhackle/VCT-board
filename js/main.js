import { isNew, esc } from "./format.js";
import { REGIONS, REGION_KO, buildTabs, buildIndex, matches, cls } from "./model.js";
import { state, saveOrder, pushTab, go, BASE, parseRoute } from "./state.js";
import { regionsHTML } from "./views/regions.js";
import { recentHTML } from "./views/recent.js";
import { scheduleHTML } from "./views/schedule.js";
import { suggestHTML, bindSuggest } from "./views/suggest.js";
import { personHTML, backHTML } from "./views/person.js";

var FILES = ["sources", "players", "coaches", "transfers", "watch", "schedule"];
var OPTIONAL = ["people", "teams"];
var STATUS_LABELS = [["all", "전체"], ["open", "구직 중"], ["signed", "새 팀 합류"], ["left", "팀 떠남"]];
var DETAIL_HIDE = ["tabs", "summary", "filters", "fresh", "sgview"];
var D = {}, TABS = [], IDX = { people: {}, teams: {}, byPerson: {}, byTeam: {} };
// 지금 화면(list, person, team, notfound)과, 상세로 오기 직전이 목록이었는지.
var VIEW = "", FROM_LIST = false;

function $(id) { return document.getElementById(id); }
function tabById(id) { return TABS.filter(function (t) { return t.id === id; })[0]; }

function renderView() {
  var tab = tabById(state.tab);
  var html = "";
  // 건의 폼은 한 번만 만들어 두고 숨기기만 한다. 탭을 나갔다 와도 쓰던 글이 남는다.
  $("view").hidden = tab.mode === "suggest";
  $("sgview").hidden = tab.mode !== "suggest";
  $("fresh").hidden = true;
  if (tab.mode === "suggest") {
    if (!$("sg")) { $("sgview").innerHTML = suggestHTML(); bindSuggest(); }
    return;
  }
  if (tab.mode === "schedule") {
    html = scheduleHTML(D.schedule);
  } else {
    var total = 0, fresh = 0, recent = state.order === "recent" && tab.mode === "entry";
    tab.groups.forEach(function (g) {
      var items = g.items.filter(function (it) { return matches(it, tab, state); });
      total += items.length;
      fresh += items.filter(isNew).length;
      if (!items.length) return;
      if (g.title) html += '<h2 class="kind">' + g.title + "</h2>";
      html += recent ? recentHTML(items, tab) : regionsHTML(items, tab);
    });
    if (!total) html = '<div class="empty">조건에 맞는 항목이 없습니다. 지역이나 상태를 바꾸거나 검색어를 지워 보세요.</div>';
    else if (fresh && tab.mode === "entry" && !recent) {
      $("fresh").hidden = false;
      $("fresh").innerHTML = '<span>최근 사흘 새 소식 <b>' + fresh + '건</b></span><button type="button" class="linkbtn" data-order="recent">최근 소식순으로 보기</button>';
    }
    if (tab.hint) html = '<p class="hint">' + tab.hint + "</p>" + html;
  }
  if (tab.mode === "entry" && state.order === "recent" && total) html = '<p class="hint">날짜별로 최신부터 나열합니다. 같은 날에는 보도 시각이 확인된 소식이 먼저 나오고, 시각을 모르는 소식은 그 아래에 놓습니다.</p>' + html;
  $("view").innerHTML = html;
}

function renderChrome() {
  var tab = tabById(state.tab);
  $("tabs").innerHTML = TABS.map(function (t) {
    return '<button type="button" class="tab" data-tab="' + t.id + '" aria-pressed="' + (state.tab === t.id) + '">' + t.label + (t.size != null ? '<span class="n">' + t.size + "</span>" : "") + "</button>";
  }).join("");

  var sched = tab.mode === "schedule";
  $("filters").hidden = sched || tab.mode === "suggest";
  $("summary").hidden = !tab.status;
  if (tab.status) {
    var base = [].concat.apply([], tab.groups.map(function (g) { return g.items; }));
    $("summary").innerHTML = STATUS_LABELS.map(function (s) {
      var n = s[0] === "all" ? base.length : base.filter(function (it) { return cls(it) === s[0]; }).length;
      return '<button type="button" class="sum ' + s[0] + '" data-status="' + s[0] + '" aria-pressed="' + (state.status === s[0]) + '"><span class="v">' + n + '</span><span class="k">' + s[1] + "</span></button>";
    }).join("");
  }
  $("regions").innerHTML = ["all"].concat(REGIONS).map(function (r) {
    return '<button type="button" class="chip" data-region="' + r + '" aria-pressed="' + (state.region === r) + '">' + (r === "all" ? "모든 지역" : REGION_KO[r]) + "</button>";
  }).join("");
  $("order").hidden = tab.mode !== "entry";
  $("order").innerHTML = [["team", "팀별로"], ["recent", "최근 소식순"]].map(function (o) {
    return '<button type="button" class="chip" data-order="' + o[0] + '" aria-pressed="' + (state.order === o[0]) + '">' + o[1] + "</button>";
  }).join("");
  ["tabs", "regions"].forEach(function (id) {
    var box = $(id), cur = box.querySelector('[aria-pressed="true"]');
    if (cur && box.scrollWidth > box.clientWidth) box.scrollLeft = cur.offsetLeft - (box.clientWidth - cur.offsetWidth) / 2;
  });
  document.title = (state.tab === "players" ? "" : tab.label + " · ") + "VCT LFT·FA 현황";
}

// 사이트 안의 인물·팀 상세 주소인지. 다른 출처나 출처 링크(외부)는 해당하지 않는다.
function isDetailLink(a) {
  return a.origin === location.origin && (a.pathname.indexOf(BASE + "p/") === 0 || a.pathname.indexOf(BASE + "t/") === 0);
}

document.addEventListener("click", function (e) {
  var a = e.target.closest("a[href]");
  if (a) {
    // "← 목록으로": 목록에서 왔으면 뒤로 가서 목록 상태를 되살리고, 아니면 목록 주소로 간다.
    if (a.dataset.back) {
      e.preventDefault();
      if (FROM_LIST) history.back(); else go(a.getAttribute("href"));
      return;
    }
    // 일반 클릭만 새로고침 없이 연다. Ctrl·⌘·Shift·Alt 를 누르면 브라우저 기본 동작(새 탭)에 맡긴다.
    if (isDetailLink(a) && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (VIEW === "list") keepList();
      go(a.pathname);
    }
    return;
  }
  var b = e.target.closest("button");
  if (!b) return;
  var tabChanged = false;
  if (b.dataset.tab) { tabChanged = b.dataset.tab !== state.tab; state.tab = b.dataset.tab; }
  else if (b.dataset.region) state.region = b.dataset.region;
  else if (b.dataset.status) state.status = b.dataset.status;
  else if (b.dataset.order) saveOrder(b.dataset.order);
  else return;
  renderChrome();
  renderView();
  if (tabChanged) pushTab();
});

// 상세로 가기 전에 목록 상태와 스크롤 위치를 지금 기록(목록 항목)에 적어 둔다. 뒤로 오면 savedList() 로 되살린다.
function keepList() {
  try {
    history.replaceState({ vct: { y: window.scrollY, region: state.region, status: state.status, order: state.order, q: $("q").value } }, "");
  } catch (e) {}
}
function savedList() {
  try { return (history.state && history.state.vct) || null; } catch (e) { return null; }
}

// 주소에 맞춰 목록이나 상세를 그린다. 처음 열 때, go(), 뒤로·앞으로, #탭 변경이 모두 이 길로 온다.
function renderRoute() {
  if (!TABS.length) return;
  var r = parseRoute(location, BASE), notes = document.querySelector(".notes");
  if (r.view === "list") {
    var h = r.tab || "players", saved = savedList();
    // 목록 안에서 같은 탭이면 다시 그리지 않는다(기존 동작).
    if (VIEW === "list" && (h === state.tab || !tabById(h))) return;
    if (saved) {
      state.region = saved.region; state.status = saved.status; state.order = saved.order;
      state.q = saved.q.trim(); $("q").value = saved.q;
    }
    if (tabById(h)) state.tab = h;
    $("tabs").hidden = false;
    if (notes) notes.hidden = false;
    renderChrome();
    renderView();
    if (saved) window.scrollTo(0, saved.y);
  } else {
    FROM_LIST = VIEW === "list";
    showDetail(r);
    window.scrollTo(0, 0);
    if (notes) notes.hidden = true;
  }
  VIEW = r.view;
}
window.addEventListener("hashchange", renderRoute);
window.addEventListener("popstate", renderRoute);
$("q").addEventListener("input", function (e) {
  state.q = e.target.value.trim();
  renderView();
});

// 상세 화면: 탭·요약·필터를 숨기고 제목을 바꾼다.
function showDetail(r) {
  DETAIL_HIDE.forEach(function (id) { $(id).hidden = true; });
  $("view").hidden = false;
  var name = "", html;
  if (r.view === "person") {
    var ph = personHTML(r.id, IDX);
    name = ph.name; html = ph.html;
  } else if (r.view === "team") {
    // TEMP: 팀 상세는 3단계(S3-01)에서 만든다. 지금은 이름과 안내만 둔다.
    var team = IDX.teams[r.id];
    name = team ? team.name : r.id;
    html = team || IDX.byTeam[r.id]
      ? '<section class="detail-page">' + backHTML() + '<div class="empty">팀 상세는 준비 중입니다: ' + esc(name) + "</div></section>"
      : '<section class="detail-page">' + backHTML() + '<div class="empty">찾을 수 없는 팀입니다.</div></section>';
  } else {
    html = '<section class="detail-page">' + backHTML() + '<div class="empty">찾을 수 없는 주소입니다.</div></section>';
  }
  $("view").innerHTML = html;
  document.title = (name || "찾을 수 없음") + " · VCT LFT·FA 현황";
}

function load(f) {
  return fetch("data/" + f + ".json").then(function (r) {
    if (!r.ok) throw new Error(f + " " + r.status);
    return r.json();
  });
}
// 선택 파일은 아직 없을 수 있다(배포 초기에는 정상). 실패하면 조용히 빈 배열로 둔다.
Promise.all(FILES.map(load).concat(OPTIONAL.map(function (f) {
  return load(f).catch(function () { return []; });
}))).then(function (all) {
  FILES.concat(OPTIONAL).forEach(function (f, i) { D[f] = all[i]; });
  OPTIONAL.forEach(function (f) { if (!Array.isArray(D[f])) D[f] = []; });
  TABS = buildTabs(D);
  IDX = buildIndex(D);
  // 목록 상태를 뒤로 가기로 되살리려면 브라우저의 자동 스크롤 복원을 끈다.
  try { history.scrollRestoration = "manual"; } catch (e) {}
  renderRoute();
}).catch(function () {
  $("view").innerHTML = '<div class="empty">데이터를 불러오지 못했습니다. 잠시 뒤 다시 열어 보세요.</div>';
});
