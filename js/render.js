// #view 에 넣을 내용(목록·상세)을 그리고, 주소에 맞춰 목록과 상세 중 무엇을 보일지 고른다.
import { fmtDate } from "./format.js";
import { matches } from "./model.js";
import { t } from "./i18n.js";
import { state, ROUTE_BASE, parseRoute, filtersOf, listAction, app, tabById } from "./state.js";
import { regionsHTML } from "./views/regions.js";
import { recentHTML } from "./views/recent.js";
import { scheduleHTML } from "./views/schedule.js";
import { suggestHTML, bindSuggest } from "./views/suggest.js";
import { personHTML, backHTML } from "./views/person.js";
import { teamHTML } from "./views/team.js";
import { rosterHTML } from "./views/roster.js";
import { resetFolds } from "./components/row.js";
import { DETAIL_HIDE, $, jumpList, renderChrome, langLinks, detailChrome, dock, freshDay } from "./chrome.js";

export function renderView() {
  freshDay();
  var tab = tabById(state.tab);
  resetFolds();
  var html = "";
  // 건의 폼은 한 번만 만들어 두고 숨기기만 한다. 탭을 나갔다 와도 쓰던 글이 남는다.
  $("view").hidden = tab.mode === "suggest";
  $("sgview").hidden = tab.mode !== "suggest";
  if (tab.mode === "suggest") {
    if (!$("sg")) { $("sgview").innerHTML = suggestHTML(); bindSuggest(); }
    jumpList();
    return;
  }
  if (tab.mode === "roster") {
    // 로스터 탭은 지역 거르기만 쓴다. 상태·거르기 칩은 숨겨져 있다(renderChrome).
    html = rosterHTML(tab.cards, state);
    if (tab.hint) html = '<p class="hint">' + tab.hint + "</p>" + html;
    $("view").innerHTML = html;
    jumpList();
    return;
  }
  if (tab.mode === "schedule") {
    html = scheduleHTML(app.D.schedule);
  } else {
    // 오늘 탭은 날짜순(최근 소식순)으로, 나머지 목록 탭은 팀별로 그린다.
    // 오늘 탭과, 정렬을 최근 소식순으로 켠 목록 탭(선수·코치·한국·이적)은 날짜순, 나머지 목록 탭은 팀별로 그린다.
    var total = 0, recent = tab.mode === "entry" && (tab.id === "today" || state.order === "recent");
    tab.groups.forEach(function (g) {
      var items = g.items.filter(function (it) { return matches(it, tab, state); });
      total += items.length;
      if (!items.length) return;
      if (g.title) html += '<h2 class="kind">' + g.title + "</h2>";
      html += recent ? recentHTML(items, tab) : regionsHTML(items, tab);
    });
    if (!total) html = '<div class="empty">' + t("msg.empty") + "</div>";
    // 오늘 소식이 없으면 가장 최근 날짜를 알린다(fallbackDate 는 buildTabs 가 정한다).
    var hint = tab.fallbackDate != null ? t("hint.todayFallback", { d: fmtDate(tab.fallbackDate) }) : tab.hint;
    if (hint) html = '<p class="hint">' + hint + "</p>" + html;
  }
  $("view").innerHTML = html;
  jumpList();
}

// 상세로 가기 전에 목록 상태와 스크롤 위치를 지금 기록(목록 항목)에 적어 둔다. 뒤로 오면 savedList() 로 되살린다.
export function keepList() {
  try {
    history.replaceState({ vct: { y: window.scrollY, region: state.region, status: state.status, q: $("q").value } }, "");
  } catch (e) {}
}
function savedList() {
  try { return (history.state && history.state.vct) || null; } catch (e) { return null; }
}

// 주소에 맞춰 목록이나 상세를 그린다. 처음 열 때, go(), 뒤로·앞으로, #탭 변경이 모두 이 길로 온다.
export function renderRoute() {
  if (!app.TABS.length) return;
  var r = parseRoute(location, ROUTE_BASE), notes = document.querySelector(".notes");
  if (r.view === "list") {
    var h = r.tab || "players", saved = savedList();
    // 목록 안에서 같은 탭이면 다시 그리지 않는다(기존 동작). 같은 탭에서 주소의 거르기만 바뀌면 그 값으로 다시 그린다.
    var nf = filtersOf(location), act = listAction(app.view, state.tab, h, !!tabById(h), state, nf);
    if (act === "none") return;
    if (act === "refilter") {
      Object.assign(state, nf);
      renderChrome();
      renderView();
      return;
    }
    if (saved) {
      state.region = saved.region; state.status = saved.status;
      state.q = saved.q.trim(); $("q").value = saved.q;
    }
    if (tabById(h)) state.tab = h;
    // 거르기는 주소(?…)에서 읽는다. 주소가 없으면 기본값이다.
    Object.assign(state, filtersOf(location));
    $("tabs").hidden = false;
    if (notes) notes.hidden = false;
    detailChrome(false);
    renderChrome();
    renderView();
    if (saved) window.scrollTo(0, saved.y);
  } else {
    app.fromList = app.view === "list";
    showDetail(r);
    detailChrome(true);
    window.scrollTo(0, 0);
    if (notes) notes.hidden = true;
  }
  app.view = r.view;
  langLinks();
  dock();
}

// 상세 화면: 탭·요약·필터를 숨기고 제목을 바꾼다.
function showDetail(r) {
  freshDay();
  DETAIL_HIDE.forEach(function (id) { $(id).hidden = true; });
  $("view").hidden = false;
  var name = "", html;
  if (r.view === "person") {
    var ph = personHTML(r.id, app.IDX);
    name = ph.name; html = ph.html;
  } else if (r.view === "team") {
    var th = teamHTML(r.id, app.IDX);
    name = th.name; html = th.html;
  } else {
    html = '<section class="detail-page">' + backHTML() + '<div class="empty">' + t("msg.notfound") + "</div></section>";
  }
  $("view").innerHTML = html;
  document.title = (name || t("title.notfound")) + t("title.suffix");
}
