import { isNew, esc, withKst, fmtDate } from "./format.js";
import { REGIONS, regionName, regionShort, buildTabs, buildIndex, matches, cls } from "./model.js";
import { t, LANG, ledeHTML, setEnTable } from "./i18n.js";
import { state, saveOrder, pushTab, go, BASE, ROUTE_BASE, parseRoute, filtersOf, queryOf, POS_VALUES, listAction, themeOf } from "./state.js";
import { regionsHTML } from "./views/regions.js";
import { recentHTML } from "./views/recent.js";
import { scheduleHTML } from "./views/schedule.js";
import { suggestHTML, bindSuggest } from "./views/suggest.js";
import { personHTML, backHTML } from "./views/person.js";
import { teamHTML } from "./views/team.js";
import { rosterHTML } from "./views/roster.js";
import { resetFolds } from "./components/row.js";

var FILES = ["sources", "players", "coaches", "transfers", "watch", "schedule"];
var OPTIONAL = ["people", "teams"];
// 상태 칩 이름은 쓰는 시점에 사전에서 읽는다.
function statusLabels() { return [["all", t("status.all")], ["open", t("status.open")], ["signed", t("status.signed")], ["left", t("status.left")]]; }
var DETAIL_HIDE = ["tabs", "filters", "sgview", "dock"];
var D = {}, TABS = [], IDX = { people: Object.create(null), teams: Object.create(null), byPerson: Object.create(null), byTeam: Object.create(null) };
// 지금 화면(list, person, team, notfound)과, 상세로 오기 직전이 목록이었는지.
var VIEW = "", FROM_LIST = false, FRESH = 0;

function $(id) { return document.getElementById(id); }
function tabById(id) { return TABS.filter(function (t) { return t.id === id; })[0]; }

function renderView() {
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
    // 로스터 탭은 지역 거르기만 쓴다. 정렬·상태·거르기 칩은 숨겨져 있다(renderChrome).
    $("view").innerHTML = rosterHTML(tab.cards, state);
    jumpList();
    return;
  }
  if (tab.mode === "schedule") {
    html = scheduleHTML(D.schedule);
  } else {
    // 오늘 탭은 정렬 칩과 상관없이 최근 소식순으로 그린다.
    var total = 0, fresh = 0, recent = (state.order === "recent" || tab.id === "today") && tab.mode === "entry";
    tab.groups.forEach(function (g) {
      var items = g.items.filter(function (it) { return matches(it, tab, state); });
      total += items.length;
      fresh += items.filter(isNew).length;
      if (!items.length) return;
      if (g.title) html += '<h2 class="kind">' + g.title + "</h2>";
      html += recent ? recentHTML(items, tab) : regionsHTML(items, tab);
    });
    if (!total) html = '<div class="empty">' + t("msg.empty") + "</div>";
    // 오늘 소식이 없으면 가장 최근 날짜를 알린다(fallbackDate 는 buildTabs 가 정한다).
    var hint = tab.fallbackDate != null ? t("hint.todayFallback", { d: fmtDate(tab.fallbackDate) }) : tab.hint;
    if (hint) html = '<p class="hint">' + hint + "</p>" + html;
  }
  if (tab.mode === "entry" && state.order === "recent" && total) html = '<p class="hint">' + t("hint.recent") + "</p>" + html;
  $("view").innerHTML = html;
  // 최근 사흘 새 소식 수는 "최근 소식순" 칩에 붙인다. 따로 줄을 두지 않아 첫 화면이 짧아진다.
  if (tab.mode === "entry" && fresh !== FRESH) { FRESH = fresh; syncFilters(tab); }
  jumpList();
}


// 바로가기: 목록의 구역 머리(.rh)마다 id 를 붙이고 고르기 상자를 채운다. 구역이 둘 미만이면 고르기 상자를 숨긴다.
function jumpList() {
  var heads = $("view").hidden ? [] : $("view").querySelectorAll(".rh"), opts = '<option value="">' + t("jump.placeholder") + "</option>";
  Array.prototype.forEach.call(heads, function (h, i) {
    var kind = h.previousElementSibling && h.previousElementSibling.classList.contains("kind") ? h.previousElementSibling.textContent + " · " : "";
    h.id = "j" + i;
    opts += '<option value="j' + i + '">' + esc(kind + h.querySelector("h2").textContent) + "</option>";
  });
  $("jump").innerHTML = opts;
  $("jumpbox").hidden = heads.length < 2;
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
    // 요약 칩 개수는 지역·검색·거르기를 반영한다(상태 칩 자체는 개수에서 뺀다).
    var cs = Object.assign({}, state, { status: "all" });
    $("summary").innerHTML = statusLabels().map(function (s) {
      var n = base.filter(function (it) { return matches(it, tab, cs) && (s[0] === "all" || cls(it) === s[0]); }).length;
      return '<button type="button" class="chip sum ' + s[0] + '" data-status="' + s[0] + '" aria-pressed="' + (state.status === s[0]) + '"><span class="k">' + s[1] + '</span><span class="n">' + n + "</span></button>";
    }).join("");
  }
  $("regions").innerHTML = ["all"].concat(REGIONS).map(function (r) {
    var full = r === "all" ? t("region.all") : regionName(r);
    return '<button type="button" class="chip" data-region="' + r + '" aria-pressed="' + (state.region === r) + '" aria-label="' + esc(full) + '">' + (r === "all" ? t("region.short.all") : regionShort(r)) + "</button>";
  }).join("");
  buildFilters();
  syncFilters(tab);
  ["tabs", "regions", "summary"].forEach(function (id) {
    var box = $(id), cur = box.querySelector('[aria-pressed="true"]');
    if (cur && box.scrollWidth > box.clientWidth) box.scrollLeft = cur.offsetLeft - (box.clientWidth - cur.offsetWidth) / 2;
  });
  document.title = (state.tab === "players" ? "" : tab.label + " · ") + t("title.site");
}

// 거르기 칸(포지션·단계·기간·정렬)과 VCT 파트너팀 단추는 처음 한 번만 만든다(언어는 쪽마다 정해져 있다).
// 탭을 바꿔도 칸을 새로 그리지 않아 키보드 포커스가 남는다. 쓰지 않는 칸은 자리만 남기고 가린다(줄 높이·위치가 흔들리지 않게).
var FX = null;
function fieldBox(key, label, opts) {
  var box = document.createElement("label");
  box.className = "fsel";
  box.dataset.box = key;
  var sel = document.createElement("select");
  sel.dataset.f = key;
  sel.setAttribute("aria-label", label);
  opts.forEach(function (o) { sel.add(new Option(label + " " + o[1], o[0])); });
  box.appendChild(sel);
  return box;
}
function buildFilters() {
  if (FX) return;
  FX = {
    pos: fieldBox("pos", t("filter.position"), POS_VALUES.map(function (v) { return [v, v === "all" ? t("status.all") : v]; })),
    stage: fieldBox("stage", t("filter.stage"), [["all", t("status.all")], ["confirmed", t("stage.confirmed")], ["reported", t("stage.reported")]]),
    days: fieldBox("days", t("filter.days"), [["all", t("status.all")], ["0", t("days.0")], ["3", t("days.3")], ["7", t("days.7")]]),
    order: fieldBox("order", t("order.label"), [["team", t("order.team")], ["recent", t("order.recent")]]),
    partner: document.createElement("button"),
    fresh: document.createElement("span")
  };
  FX.partner.type = "button";
  FX.partner.className = "chip toggle";
  FX.partner.dataset.partner = "1";
  FX.partner.textContent = t("filter.partner");
  FX.fresh.className = "fresh-badge";
  var sort = document.createElement("span");
  sort.className = "fsort";
  sort.appendChild(FX.order);
  sort.appendChild(FX.fresh);
  var box = $("fx");
  box.appendChild(FX.pos);
  box.appendChild(FX.stage);
  box.appendChild(FX.days);
  box.appendChild(FX.partner);
  box.appendChild(sort);
}
// 탭마다 값·보임·사용 여부를 맞춘다. 포지션은 선수·오늘·한국 탭만, 나머지 거르기와 파트너 단추는 목록 탭만,
// 정렬은 오늘 탭을 뺀 목록 탭에서만 쓴다. 새 소식 배지는 정렬을 쓸 때만 보인다.
function syncFilters(tab) {
  var entry = tab.mode === "entry";
  var use = {
    pos: entry && (tab.id === "players" || tab.id === "today" || tab.id === "korea"),
    stage: entry, days: entry, order: entry && tab.id !== "today"
  };
  var cur = { pos: state.pos, stage: state.stage, days: state.days, order: state.order };
  var dflt = { pos: "all", stage: "all", days: "all", order: "team" };
  Object.keys(use).forEach(function (k) {
    var box = FX[k], sel = box.querySelector("select");
    sel.value = cur[k];
    sel.disabled = !use[k];
    box.classList.toggle("is-off", !use[k]);
    box.classList.toggle("is-set", cur[k] !== dflt[k]);
  });
  FX.partner.disabled = !entry;
  FX.partner.classList.toggle("is-off", !entry);
  FX.partner.setAttribute("aria-pressed", String(!!state.top));
  var showFresh = use.order && !!FRESH;
  FX.fresh.hidden = !showFresh;
  if (showFresh) { FX.fresh.textContent = t("order.freshCount", { n: FRESH }); FX.fresh.title = t("order.freshTitle"); }
}

// 거르기를 바꾸면 주소의 ?…만 고친다(기록을 바꿔 쓴다). 탭 이름은 그대로다.
function syncHash() {
  try { history.replaceState(history.state, "", location.pathname + location.search + "#" + state.tab + queryOf(state)); } catch (e) {}
}

// 사이트 안의 인물·팀 상세 주소인지. 다른 출처나 출처 링크(외부)는 해당하지 않는다.
function isDetailLink(a) {
  return a.origin === location.origin && (a.pathname.indexOf(ROUTE_BASE + "p/") === 0 || a.pathname.indexOf(ROUTE_BASE + "t/") === 0);
}

// EN·KR 링크: 지금 화면과 같은 자리의 다른 언어 주소로 맞춘다. 링크는 페이지를 새로 불러온다(가로채지 않는다).
// JS 가 없을 때는 index.html 의 기본 주소(목록)가 쓰인다.
function langLinks() {
  var nav = document.querySelector(".lang-switch");
  if (!nav) return;
  var r = parseRoute(location, ROUTE_BASE);
  nav.querySelectorAll("a[data-lang]").forEach(function (a) {
    var lang = a.dataset.lang, base = BASE + (lang === "en" ? "en/" : ""), href = base;
    if (r.view === "person" || r.view === "team") href = base + (r.view === "person" ? "p/" : "t/") + r.id + "/";
    else if (r.view === "list" && r.tab) href = base + "#" + r.tab;
    a.setAttribute("href", href);
    if (lang === LANG) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
  });
}

// 화면 테마: 시스템(data-theme 없음)·라이트·다크. 고른 값은 vct-theme 에 남기고 theme-color 두 개를 그 바탕색으로 맞춘다.
var THEME_BG = { light: "#F4F5F7", dark: "#0F1318" };
function storedTheme() { try { return themeOf(localStorage.getItem("vct-theme")); } catch (e) { return "system"; } }
function setTheme(v) {
  if (v === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", v);
  try { localStorage.setItem("vct-theme", v); } catch (e) {}
  document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
    m.content = THEME_BG[v] || (/dark/.test(m.media) ? THEME_BG.dark : THEME_BG.light);
  });
  syncTheme(v);
}
function syncTheme(v) {
  document.querySelectorAll("[data-theme-set]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.themeSet === v)); });
}

// 목록 행의 펼침: 설명·출처 영역을 여닫는다. 주소·저장소에 남기지 않고 다시 그리지도 않는다(영역의 hidden 과 단추의 aria 만 바꾼다).
function toggleRow(row) {
  var btn = row.querySelector(":scope > .row-x"), fold = document.getElementById(btn.getAttribute("aria-controls"));
  var open = btn.getAttribute("aria-expanded") !== "true";
  btn.setAttribute("aria-expanded", String(open));
  btn.setAttribute("aria-label", open ? btn.dataset.collapse : btn.dataset.expand);
  fold.hidden = !open;
}

document.addEventListener("click", function (e) {
  var a = e.target.closest("a[href]");
  if (a) {
    // EN·KR 링크: 고른 언어를 기억한다(저장 실패는 무시). 링크 동작은 그대로 둔다.
    if (a.dataset.lang) { try { localStorage.setItem("vct-lang", a.dataset.lang); } catch (err) {} return; }
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
  // 행의 펼침: 펼침 단추, 또는 행 안의 링크·단추·영역이 아닌 빈 곳을 누르면 여닫는다.
  var row = e.target.closest("li.row");
  if (row && row.querySelector(":scope > .row-x") && (e.target.closest(".row-x") || !e.target.closest("button, select, input, .row-fold"))) { toggleRow(row); return; }
  var b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.themeSet) { setTheme(themeOf(b.dataset.themeSet)); return; }
  if (b.dataset.top) { window.scrollTo(0, 0); return; }
  var tabChanged = false, filterChanged = false;
  if (b.dataset.tab) { tabChanged = b.dataset.tab !== state.tab; state.tab = b.dataset.tab; }
  else if (b.dataset.region) state.region = b.dataset.region;
  else if (b.dataset.status) state.status = b.dataset.status;
  else if (b.dataset.partner) { state.top = !state.top; filterChanged = true; }
  else return;
  renderChrome();
  renderView();
  if (tabChanged) { pushTab(); langLinks(); }
  else if (filterChanged) syncHash();
});

// 거르기 칸(select)과 정렬: 바뀌면 단추와 같은 길로 다시 그린다. 칸은 그대로 두고 값만 맞춘다(syncFilters).
document.addEventListener("change", function (e) {
  var s = e.target, f = s.dataset && s.dataset.f;
  if (!f) return;
  if (f === "order") saveOrder(s.value);
  else if (f === "pos") state.pos = s.value;
  else if (f === "stage") state.stage = s.value;
  else if (f === "days") state.days = s.value;
  else return;
  renderChrome();
  renderView();
  if (f !== "order") syncHash();
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
  var r = parseRoute(location, ROUTE_BASE), notes = document.querySelector(".notes");
  if (r.view === "list") {
    var h = r.tab || "players", saved = savedList();
    // 목록 안에서 같은 탭이면 다시 그리지 않는다(기존 동작). 같은 탭에서 주소의 거르기만 바뀌면 그 값으로 다시 그린다.
    var nf = filtersOf(location), act = listAction(VIEW, state.tab, h, !!tabById(h), state, nf);
    if (act === "none") return;
    if (act === "refilter") {
      Object.assign(state, nf);
      renderChrome();
      renderView();
      return;
    }
    if (saved) {
      state.region = saved.region; state.status = saved.status; state.order = saved.order;
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
    FROM_LIST = VIEW === "list";
    showDetail(r);
    detailChrome(true);
    window.scrollTo(0, 0);
    if (notes) notes.hidden = true;
  }
  VIEW = r.view;
  langLinks();
  dock();
}
// 상세 화면에서는 사이트 제목을 <h1> 이 아닌 작은 줄로 바꾼다. 상세의 <h1> 은 인물·팀 이름 하나뿐이다.
function detailChrome(detail) {
  var el = $("site"), tag = detail ? "P" : "H1";
  document.querySelector(".lede").hidden = detail;
  if (el.tagName === tag) return;
  var n = document.createElement(tag);
  n.id = el.id; n.className = el.className; n.textContent = el.textContent;
  el.replaceWith(n);
}

// 맨 위로·바로가기 막대: 목록을 한 화면 넘게 내렸을 때만 보인다.
function dock() { $("dock").hidden = VIEW !== "list" || window.scrollY < 600; }
window.addEventListener("scroll", dock, { passive: true });
$("jump").addEventListener("change", function (e) {
  var h = document.getElementById(e.target.value);
  if (h) h.scrollIntoView();
  e.target.value = "";
});
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
    var th = teamHTML(r.id, IDX);
    name = th.name; html = th.html;
  } else {
    html = '<section class="detail-page">' + backHTML() + '<div class="empty">' + t("msg.notfound") + "</div></section>";
  }
  $("view").innerHTML = html;
  document.title = (name || t("title.notfound")) + t("title.suffix");
}

// 영문 주소인데 한국어 셸이 왔을 때(GitHub Pages 의 404.html 은 한국어 하나뿐이다) 정적 문구를 영문 사전으로 바꾼다.
// 정상 영문 페이지(build 가 만든 en/)는 html lang 이 이미 en 이라 여기서 아무것도 하지 않는다.
function localizeStatic() {
  document.documentElement.lang = "en";
  document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
    el.dataset.i18nAttr.split(";").forEach(function (pair) {
      var i = pair.indexOf(":");
      el.setAttribute(pair.slice(0, i), t(pair.slice(i + 1)));
    });
  });
  // 카카오페이는 영문 화면에서 숨긴다(toLang 과 같은 규칙).
  document.querySelectorAll('a[href*="qr.kakaopay.com"]').forEach(function (el) { el.remove(); });
  var lede = document.querySelector(".lede"), m = lede && /(\d{4}-\d{2}-\d{2} \d{1,2}:\d{2})/.exec(lede.textContent);
  if (m) lede.innerHTML = ledeHTML(LANG, m[1]);
  var notes = document.querySelector(".notes ul");
  if (notes && !notes.querySelector(".kr-note")) {
    var li = document.createElement("li");
    li.className = "kr-note";
    li.textContent = t("note.kr");
    notes.appendChild(li);
  }
}
if (LANG === "en" && document.documentElement.lang !== "en") localizeStatic();
syncTheme(storedTheme());

// 머리말 시각에 KST 를 붙인다. 텍스트 노드만 고쳐 .intro·.more 의 구조는 그대로 둔다.
var LEDE = document.querySelector(".lede");
if (LEDE) {
  var walker = document.createTreeWalker(LEDE, NodeFilter.SHOW_TEXT);
  for (var tn = walker.nextNode(); tn; tn = walker.nextNode()) tn.nodeValue = withKst(tn.nodeValue);
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
}).concat([LANG === "en" ? load("i18n-en").catch(function () { return {}; }) : {}]))).then(function (all) {
  // 본문 번역 표는 영문 화면에서만 받는다. 없거나 읽기 실패하면 빈 표로 두고 원문 + KR 로 보인다.
  setEnTable(all.pop());
  FILES.concat(OPTIONAL).forEach(function (f, i) { D[f] = all[i]; });
  OPTIONAL.forEach(function (f) { if (!Array.isArray(D[f])) D[f] = []; });
  TABS = buildTabs(D);
  IDX = buildIndex(D);
  // 목록 상태를 뒤로 가기로 되살리려면 브라우저의 자동 스크롤 복원을 끈다.
  try { history.scrollRestoration = "manual"; } catch (e) {}
  renderRoute();
}).catch(function () {
  $("view").innerHTML = '<div class="empty">' + t("msg.loadFail") + "</div>";
});
