// 시작과 이벤트만: 데이터 불러오기, 클릭·변경·주소 이벤트 연결, 머리말 시각.
import { withKst } from "./format.js";
import { buildTabs, buildIndex } from "./model.js";
import { t, LANG, ledeHTML, setEnTable } from "./i18n.js";
import { state, pushTab, go, ROUTE_BASE, clickAction, app, applyButton } from "./state.js";
import { $, renderChrome, syncHash, langLinks, dock } from "./chrome.js";
import { renderView, keepList, renderRoute } from "./render.js";

const FILES = ["sources", "players", "coaches", "transfers", "watch", "schedule"];
const OPTIONAL = ["people", "teams"];

// 사이트 안의 인물·팀 상세 주소인지. 다른 출처나 출처 링크(외부)는 해당하지 않는다.
function isDetailLink(a) {
  return a.origin === location.origin && (a.pathname.indexOf(ROUTE_BASE + "p/") === 0 || a.pathname.indexOf(ROUTE_BASE + "t/") === 0);
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
  var act = clickAction(e.target);
  if (!act) return;
  if (act.kind === "link") {
    var a = act.el;
    // EN·KR 링크: 고른 언어를 기억한다(저장 실패는 무시). 링크 동작은 그대로 둔다.
    if (a.dataset.lang) { try { localStorage.setItem("vct-lang", a.dataset.lang); } catch (err) {} return; }
    // "← 목록으로": 목록에서 왔으면 뒤로 가서 목록 상태를 되살리고, 아니면 목록 주소로 간다.
    if (a.dataset.back) {
      e.preventDefault();
      if (app.fromList) history.back(); else go(a.getAttribute("href"));
      return;
    }
    // 일반 클릭만 새로고침 없이 연다. Ctrl·⌘·Shift·Alt 를 누르면 브라우저 기본 동작(새 탭)에 맡긴다.
    if (isDetailLink(a) && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (app.view === "list") keepList();
      go(a.pathname);
    }
    return;
  }
  // 행의 펼침: 펼침 단추, 또는 행 안의 링크·단추·영역이 아닌 빈 곳을 누르면 여닫는다.
  if (act.kind === "row") { toggleRow(act.el); return; }
  var b = act.el;
  if (b.dataset.top) { window.scrollTo(0, 0); return; }
  var r = applyButton(state, b.dataset);
  if (!r) return;
  renderChrome();
  renderView();
  if (r.tabChanged) { pushTab(); langLinks(); }
  else if (r.filterChanged) syncHash();
});

// 거르기 칸(select): 바뀌면 단추와 같은 길로 다시 그린다. 칸은 그대로 두고 값만 맞춘다(syncFilters).
document.addEventListener("change", function (e) {
  var s = e.target, f = s.dataset && s.dataset.f;
  if (!f) return;
  if (f === "pos") state.pos = s.value;
  else if (f === "days") state.days = s.value;
  else return;
  renderChrome();
  renderView();
  syncHash();
});

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

// 머리말 시각에 KST 를 붙인다. 텍스트 노드만 고쳐 .intro·.more 의 구조는 그대로 둔다.
const LEDE = document.querySelector(".lede");
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
  FILES.concat(OPTIONAL).forEach(function (f, i) { app.D[f] = all[i]; });
  OPTIONAL.forEach(function (f) { if (!Array.isArray(app.D[f])) app.D[f] = []; });
  app.TABS = buildTabs(app.D);
  app.IDX = buildIndex(app.D);
  // 목록 상태를 뒤로 가기로 되살리려면 브라우저의 자동 스크롤 복원을 끈다.
  try { history.scrollRestoration = "manual"; } catch (e) {}
  renderRoute();
}).catch(function () {
  $("view").innerHTML = '<div class="empty">' + t("msg.loadFail") + "</div>";
});
