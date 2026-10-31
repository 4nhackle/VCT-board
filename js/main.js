import { isNew, esc } from "./format.js";
import { REGIONS, REGION_KO, buildTabs, matches, cls } from "./model.js";
import { state, saveOrder, pushTab, BASE, parseRoute } from "./state.js";
import { regionsHTML } from "./views/regions.js";
import { recentHTML } from "./views/recent.js";
import { scheduleHTML } from "./views/schedule.js";
import { suggestHTML, bindSuggest } from "./views/suggest.js";

var FILES = ["sources", "players", "coaches", "transfers", "watch", "schedule"];
var OPTIONAL = ["people", "teams"];
var STATUS_LABELS = [["all", "전체"], ["open", "구직 중"], ["signed", "새 팀 합류"], ["left", "팀 떠남"]];
var D = {}, TABS = [];

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

document.addEventListener("click", function (e) {
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

// 주소에 맞춰 목록이나 상세를 그린다. 처음 열 때, go(), 뒤로·앞으로, #탭 변경이 모두 이 길로 온다.
var VIEW = "";
function renderRoute() {
  if (!TABS.length) return;
  var r = parseRoute(location, BASE), notes = document.querySelector(".notes");
  if (r.view === "list") {
    var h = r.tab || "players";
    // 목록 안에서 같은 탭이면 다시 그리지 않는다(기존 동작).
    if (VIEW === "list" && (h === state.tab || !tabById(h))) return;
    if (tabById(h)) state.tab = h;
    $("tabs").hidden = false;
    if (notes) notes.hidden = false;
    renderChrome();
    renderView();
  } else {
    ["tabs", "summary", "filters", "fresh", "sgview"].forEach(function (id) { $(id).hidden = true; });
    if (notes) notes.hidden = true;
    $("view").hidden = false;
    // TEMP: 임시 화면. 2회차 S1-07·S1-08 에서 실제 상세 화면으로 바꾼다.
    $("view").innerHTML = '<div class="empty">' + (r.view === "notfound" ? "찾을 수 없는 주소입니다" : "상세 화면 준비 중: " + esc(r.view) + "·" + esc(r.id)) + "</div>";
  }
  VIEW = r.view;
}
window.addEventListener("hashchange", renderRoute);
window.addEventListener("popstate", renderRoute);
$("q").addEventListener("input", function (e) {
  state.q = e.target.value.trim();
  renderView();
});

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
  renderRoute();
}).catch(function () {
  $("view").innerHTML = '<div class="empty">데이터를 불러오지 못했습니다. 잠시 뒤 다시 열어 보세요.</div>';
});
