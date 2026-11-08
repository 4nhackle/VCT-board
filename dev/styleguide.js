// 견본 안쪽(styleguide.html?frame=1): 실제 CSS 와 실제 렌더 함수로 샘플을 그린다.
// 샘플은 scripts/fixtures 에서 온다(dev-server 가 dev/fixtures/ 로 연다). data/ 는 읽지 않는다.
import { setLang, t } from "../js/i18n.js";
import { buildTabs, buildIndex, routeOf, REGIONS } from "../js/model.js";
import { regionsHTML } from "../js/views/regions.js";
import { recentHTML } from "../js/views/recent.js";
import { infoHTML, monoHTML } from "../js/views/common.js";
import { routeHTML } from "../js/components/route.js";

const q = new URLSearchParams(location.search);
const lang = q.get("lang") === "en" ? "en" : "ko";
const mode = q.get("mode") === "dark" ? "dark" : "light";
// 강제 테마 블록(:root[data-theme])으로 색을 정한다. 틀의 배경 지정은 떼어 실제 본문 배경을 쓴다.
document.documentElement.dataset.theme = mode;
document.documentElement.lang = lang;
document.body.className = "";
document.getElementById("outer").remove();
setLang(lang);

const load = (f) => fetch(new URL("fixtures/" + f, import.meta.url)).then((r) => {
  if (!r.ok) throw new Error("견본 데이터를 읽지 못했다: " + f + " " + r.status);
  return r.json();
});
const [sources, people, teams, players, coaches, transfers, watch, schedule, extra] = await Promise.all(
  ["sources.json", "people.json", "teams.json", "players.json", "coaches.json", "transfers.json", "watch.json", "schedule.json", "styleguide/extra.json"].map(load)
);

// 실제 화면과 같은 방법으로 탭 항목을 만든다. 경계 사례(extra)는 그 위에 더한 행이다.
const D = {
  sources, people, teams, schedule,
  players: players.concat(extra.players),
  coaches: coaches.concat(extra.coaches),
  transfers: { players: transfers.players.concat(extra.transfers), coaches: transfers.coaches || [] },
  watch: watch.concat(extra.watch)
};
const TABS = buildTabs(D);
const IDX = buildIndex(D);
const tab = (id) => TABS.find((x) => x.id === id);
const itemsOf = (id) => tab(id).groups.flatMap((g) => g.items);
const sample = (id, rows) => { const names = new Set(rows.map((r) => r.name)); return itemsOf(id).filter((it) => names.has(it.name)); };

const EXTRA_PLAYERS = sample("players", extra.players);
const EXTRA_COACHES = sample("coaches", extra.coaches);
const EXTRA_TRANSFERS = sample("transfers", extra.transfers);
const WATCH = itemsOf("watch");
const MOVE = EXTRA_TRANSFERS.find((it) => it.moved) || EXTRA_TRANSFERS[0];

// 토큰 표: 이름, 실제 값(계산된 값), 미리보기
const TOKEN_GROUPS = [
  ["글자", ["--text-meta", "--text-small", "--text-body", "--text-name", "--text-title", "--text-display", "--text-region", "--text-team"]],
  ["간격", ["--space-xs", "--space-s", "--space-m", "--space-l", "--space-xl", "--space-2xl", "--space-3xl"]],
  ["모서리", ["--radius-s", "--radius-m", "--radius-pill"]],
  ["색", ["--color-bg", "--surface", "--surface-float", "--color-ink", "--color-mute", "--color-line", "--color-line-strong", "--color-accent", "--color-on-accent", "--color-mono-bg", "--color-mono-fg"]],
  ["상태", ["--status-open-bg", "--status-open-fg", "--status-open-rail", "--status-signed-bg", "--status-signed-fg", "--status-signed-rail", "--status-left-bg", "--status-left-fg", "--status-left-rail", "--status-warn-bg", "--status-warn-fg"]],
  ["터치", ["--control-h"]]
];
const cs = getComputedStyle(document.documentElement);
const preview = (name) => {
  if (name.startsWith("--text-")) return '<span style="font-size: var(' + name + ')">가나다 Aa 123</span>';
  if (name.startsWith("--space-")) return '<span class="sg-bar-sp" style="width: var(' + name + ')"></span>';
  if (name.startsWith("--radius-")) return '<span class="sg-radius" style="border-radius: var(' + name + ')"></span>';
  if (name.startsWith("--control-")) return '<span class="sg-ctl" style="height: var(' + name + ')">높이</span>';
  return '<span class="sg-sw" style="background: var(' + name + ')"></span>';
};
const tokenTable = TOKEN_GROUPS.map(([label, names]) =>
  '<h4 class="sg-sub">' + label + '</h4><table class="sg-tokens"><tbody>' + names.map((n) =>
    "<tr><th scope=\"row\">" + n + "</th><td>" + cs.getPropertyValue(n).trim() + "</td><td>" + preview(n) + "</td></tr>"
  ).join("") + "</tbody></table>"
).join("");

// 목록 머리와 행: 실제 regionsHTML 이 머리(지역·팀)와 행을 그린다.
const listPlayers = regionsHTML(EXTRA_PLAYERS, tab("players")) + regionsHTML(EXTRA_COACHES, tab("coaches"));
const listTransfers = regionsHTML(EXTRA_TRANSFERS, tab("transfers"));
const listWatch = regionsHTML(WATCH, tab("watch"));
const recent = recentHTML(EXTRA_PLAYERS.concat(EXTRA_TRANSFERS), tab("players"));

// 상세 머리와 정보 칸: 실제 infoHTML·monoHTML 을 쓴다.
const detail = '<header class="dp-head">' + monoHTML("Absol") + '<h1 class="dp-name">Absol</h1><p class="dp-real">견본 실명</p></header>' +
  infoHTML([["소속 팀", "Sentinels"], ["역할", "Duelist"], ["국적", ""], ["생년월일", "2006-08-27 (20세)"], ["계약 만료", ""], ["이적 완료", ""]]);
const moveCard = MOVE ? '<div class="dp-move"><p class="dp-move-title">이번 이동</p>' + routeHTML(routeOf(MOVE, IDX.teams)) + "</div>" : "";

// 탭·고정 막대: main.js 의 탭 마크업과 같은 모양(main.js 는 불러오면 바로 시작하므로 여기서 같은 모양으로 그린다).
const tabs = '<nav class="tabs" aria-label="보기 선택">' + TABS.filter((t) => t.mode !== "suggest").map((t) =>
  '<button type="button" class="tab" data-tab="' + t.id + '" aria-pressed="' + (t.id === "players") + '">' + t.label + (t.size != null ? '<span class="n">' + t.size + "</span>" : "") + "</button>"
).join("") + "</nav>";
const dock = '<div class="dock"><div class="jump"><select aria-label="지역 바로가기">' + REGIONS.map((r) => "<option>" + r + "</option>").join("") + '</select></div><button type="button" class="totop" aria-label="맨 위로">▲</button></div>';

// 테마 전환(실제 헤더와 같은 마크업)과 경고 배지: 라이트·다크 어느 쪽에서도 ⚠ 가 붙는지 본다.
const themeSwitch = '<div class="theme-switch" role="group" aria-label="' + t("theme.label") + '">' +
  ["system", "light", "dark"].map((v) => '<button type="button" data-theme-set="' + v + '" aria-pressed="' + (v === "system") + '">' + t("theme." + v) + "</button>").join("") + "</div>";
const warnSample = '<p><span class="wk withdraw">철회</span> <span class="dp-off">탈퇴</span></p><p class="dp-box">경고 상자 견본</p>';

const section = (title, body) => '<section class="sg-sec"><h2 class="sg-h">' + title + "</h2>" + body + "</section>";
document.querySelector("#sg-root") || document.body.insertAdjacentHTML("beforeend", '<main id="sg-root" class="page"></main>');
document.getElementById("sg-root").innerHTML = [
  section("토큰", tokenTable),
  section("탭", tabs),
  section("지역 머리, 팀 머리, 행", '<div id="view">' + listPlayers + "</div>"),
  section("이적 행: 이동 경로, 잔류", '<div id="view">' + listTransfers + "</div>"),
  section("지켜볼 팀", '<div id="view">' + listWatch + "</div>"),
  section("날짜 머리(최근 소식순)", '<div id="view">' + recent + "</div>"),
  section("상세 머리, 정보 칸, 이번 이동", '<div class="detail-page">' + detail + moveCard + "</div>"),
  section("화면 테마 전환", '<div class="top-prefs">' + themeSwitch + "</div>"),
  section("경고 배지", warnSample),
  section("고정 막대", dock)
].join("");
