// 목록 화면의 틀: 탭·요약·거르기 칸·주소 표시·EN/KR 링크. DOM 을 직접 만진다.
import { esc, TODAY, refreshToday } from "./format.js";
import { REGIONS, regionName, regionShort, matches, cls, buildTabs } from "./model.js";
import { t, LANG } from "./i18n.js";
import { state, BASE, ROUTE_BASE, parseRoute, queryOf, POS_VALUES, app, tabById } from "./state.js";

// 상태 칩 이름은 쓰는 시점에 사전에서 읽는다.
function statusLabels() { return [["all", t("status.all")], ["open", t("status.open")], ["signed", t("status.signed")], ["left", t("status.left")]]; }
export var DETAIL_HIDE = ["tabs", "filters", "sgview", "dock"];

export function $(id) { return document.getElementById(id); }
// 그릴 때마다 오늘 날짜를 새로 잡는다. 날짜가 바뀌었으면 탭 목록도 다시 만든다(오늘 탭의 인물 묶음과 개수가 buildTabs 때 정해진다).
export function freshDay() { var before = TODAY; refreshToday(); if (TODAY !== before) app.TABS = buildTabs(app.D); }

// 바로가기: 목록의 구역 머리(.rh)마다 id 를 붙이고 고르기 상자를 채운다. 구역이 둘 미만이면 고르기 상자를 숨긴다.
export function jumpList() {
  var heads = $("view").hidden ? [] : $("view").querySelectorAll(".rh"), opts = '<option value="">' + t("jump.placeholder") + "</option>";
  Array.prototype.forEach.call(heads, function (h, i) {
    var kind = h.previousElementSibling && h.previousElementSibling.classList.contains("kind") ? h.previousElementSibling.textContent + " · " : "";
    h.id = "j" + i;
    opts += '<option value="j' + i + '">' + esc(kind + h.querySelector("h2").textContent) + "</option>";
  });
  $("jump").innerHTML = opts;
  $("jumpbox").hidden = heads.length < 2;
}

export function renderChrome() {
  freshDay();
  var tab = tabById(state.tab);
  $("tabs").innerHTML = app.TABS.map(function (t) {
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

// 거르기 칸(포지션·기간)과 VCT 파트너팀 단추는 처음 한 번만 만든다(언어는 쪽마다 정해져 있다).
// 탭을 바꿔도 칸을 새로 그리지 않아 키보드 포커스가 남는다. 쓰지 않는 칸은 자리만 남기고 가린다(줄 높이·위치가 흔들리지 않게).
var FX = null;
function fieldBox(key, label, opts) {
  var box = document.createElement("label");
  box.className = "fsel";
  box.dataset.box = key;
  var sel = document.createElement("select");
  sel.dataset.f = key;
  sel.setAttribute("aria-label", label);
  // 기본값("all")은 칸 이름만 보이고, 고른 값은 값 글자만 보인다. 목록의 첫 줄도 칸 이름이다.
  opts.forEach(function (o) { sel.add(new Option(o[0] === "all" ? label : o[1], o[0])); });
  box.appendChild(sel);
  return box;
}
function buildFilters() {
  if (FX) return;
  FX = {
    pos: fieldBox("pos", t("filter.position"), POS_VALUES.map(function (v) { return [v, v]; })),
    days: fieldBox("days", t("filter.days"), [["all", ""], ["0", t("days.0")], ["3", t("days.3")], ["7", t("days.7")]]),
    partner: document.createElement("button")
  };
  FX.partner.type = "button";
  FX.partner.className = "chip toggle";
  FX.partner.dataset.partner = "1";
  FX.partner.textContent = t("filter.partner");
  FX.order = document.createElement("button");
  FX.order.type = "button";
  FX.order.className = "chip toggle";
  FX.order.dataset.order = "1";
  FX.order.textContent = t("order.recent");
  var box = $("fx");
  box.appendChild(FX.pos);
  box.appendChild(FX.days);
  box.appendChild(FX.partner);
  box.appendChild(FX.order);
}
// 탭마다 값·보임·사용 여부를 맞춘다. 포지션은 선수·오늘·한국·이적 탭만, 기간과 파트너 단추는 목록 탭만 쓴다.
function syncFilters(tab) {
  var entry = tab.mode === "entry";
  var use = {
    pos: entry && (tab.id === "players" || tab.id === "today" || tab.id === "korea" || tab.id === "transfers"),
    days: entry
  };
  var cur = { pos: state.pos, days: state.days };
  var dflt = { pos: "all", days: "all" };
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
  // 최근 소식순 단추: 선수·코치·한국·이적 목록 탭에서만. 오늘 탭은 늘 날짜순이라 단추가 없다(자리만 남긴다).
  var orderUse = entry && tab.id !== "today";
  FX.order.disabled = !orderUse;
  FX.order.classList.toggle("is-off", !orderUse);
  FX.order.setAttribute("aria-pressed", String(state.order === "recent"));
}

// 거르기를 바꾸면 주소의 ?…만 고친다(기록을 바꿔 쓴다). 탭 이름은 그대로다.
export function syncHash() {
  try { history.replaceState(history.state, "", location.pathname + location.search + "#" + state.tab + queryOf(state)); } catch (e) {}
}

// EN·KR 링크: 지금 화면과 같은 자리의 다른 언어 주소로 맞춘다. 링크는 페이지를 새로 불러온다(가로채지 않는다).
// JS 가 없을 때는 index.html 의 기본 주소(목록)가 쓰인다.
export function langLinks() {
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

// 상세 화면에서는 사이트 제목을 <h1> 이 아닌 작은 줄로 바꾼다. 상세의 <h1> 은 인물·팀 이름 하나뿐이다.
export function detailChrome(detail) {
  var el = $("site"), tag = detail ? "P" : "H1";
  document.querySelector(".lede").hidden = detail;
  if (el.tagName === tag) return;
  var n = document.createElement(tag);
  n.id = el.id; n.className = el.className; n.textContent = el.textContent;
  el.replaceWith(n);
}

// 맨 위로·바로가기 막대: 목록을 한 화면 넘게 내렸을 때만 보인다.
export function dock() { $("dock").hidden = app.view !== "list" || window.scrollY < 600; }
