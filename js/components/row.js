import { esc, isNew, isoOf, relDate, stampLabel, textHTML } from "../format.js";
import { regionShort, pillOf, routeOf, slugOf, watchMeta, cleanName, contractOK } from "../model.js";
import { t, trWhole } from "../i18n.js";
import { splitNote, srcsHTML, termHTML, nameHTML, noteText } from "../views/common.js";
import { personUrl, teamUrl } from "../state.js";
import { pill } from "./pill.js";
import { routeHTML } from "./route.js";
import { badge } from "./badge.js";

// id 가 없으면 링크 없이 글자만 둔다. html 은 이미 이스케이프된 글이다.
function link(cls, href, html) {
  return href ? '<a class="' + cls + '" href="' + esc(href) + '">' + html + "</a>" : '<span class="' + cls + '">' + html + "</span>";
}

// 펼침 영역 번호. 목록을 그릴 때마다 renderView 가 resetFolds()로 0 에 되돌린다. 단추의 aria-controls 와 영역 id 가 같다.
var FOLD_SEQ = 0;
export function resetFolds() { FOLD_SEQ = 0; }

// 목록 머리 행(데스크톱에서만 보인다). 칸 순서는 행과 같다. 스크린 리더에는 읽히지 않는다.
export function colsHTML() {
  return '<li class="cols" aria-hidden="true"><span>' + t("col.person") + "</span><span>" + t("col.move") + "</span><span>" + t("col.status") + "</span><span>" + t("col.date") + "</span><span></span></li>";
}

// 펼침 단추와 영역. 내용이 없으면 단추도 영역도 만들지 않는다. 엔트리 행과 지켜볼 팀 행이 함께 쓴다.
function foldHTML(detail) {
  if (!detail) return { btn: "", fold: "" };
  var id = "row-fold-" + (++FOLD_SEQ), more = t("row.expand"), less = t("row.collapse");
  return {
    btn: '<button type="button" class="row-x" aria-expanded="false" aria-controls="' + id + '" aria-label="' + esc(more) + '" data-expand="' + esc(more) + '" data-collapse="' + esc(less) + '"></button>',
    fold: '<div class="row-fold" id="' + id + '" hidden>' + detail + "</div>"
  };
}

// 지켜볼 팀 행: 종류 배지와 팀 링크, 확정·확인 날짜, "대상" 라벨, 첫 조각(보이는 줄), 나머지 조각과 출처 줄(펼침).
function watchHTML(it, tab) {
  // 대상 팀마다 따로 링크한다. 팀 이름 칸은 " / " 로 나뉘어 있다. teams 에 없는 ID 는 링크 없이 글자만.
  var parts = String(it.team || "").split(" / ");
  var names = parts.map(function (n, i) {
    var id = it.tids && it.tids.length === parts.length ? it.tids[i] : slugOf(n);
    return link("name", id && tab.teams && tab.teams.has(id) ? teamUrl(id) : "", textHTML(n));
  }).join(" / ");
  var w = watchMeta(it.note), sp = splitNote(noteText(w.body, true));
  var state = (w.confirmed ? '<span class="ok">' + t("row.confirmed") + "</span>" : "") + (w.checked ? '<span class="chk">' + t("row.checked", { date: esc(w.checked) }) + "</span>" : "");
  // shortcut: 첫 " / " 조각만 보인다. 긴 조각은 CSS 가 두 줄로 자른다. 캡션 칸이 필요하면 이 자리에서 바꾼다.
  var cut = sp.body.indexOf(" / "), head = cut < 0 ? sp.body : sp.body.slice(0, cut), rest = cut < 0 ? "" : sp.body.slice(cut + 3);
  var f = foldHTML((rest ? '<p class="detail">' + textHTML(rest) + "</p>" : "") + srcsHTML(sp, it.src));
  return '<li class="row watch"><div class="main">' + (w.kind ? '<span class="wk ' + w.kind + '">' + esc(w.label) + "</span>" : "") + names + "</div>" +
    (state ? '<div class="state">' + state + "</div>" : "") +
    '<p class="detail"><span class="lbl">' + t("row.target") + "</span>" + termHTML(it.name) + "</p>" +
    (head ? '<p class="detail head">' + textHTML(head) + "</p>" : "") + f.btn + f.fold + "</li>";
}

// 행의 칸 순서: 사람(이름·메타) · 이동(경로 또는 팀) · 상태(알약·배지·상태 글) · 날짜 · 펼침 단추. 펼침 영역은 설명·단체 링크·출처 줄.
// 팀 로고 자리(D4)는 이름과 도착 팀 앞에 둔다. 지금은 빈 칸이다.
export function rowHTML(it, tab, opt) {
  if (tab.mode === "watch") return watchHTML(it, tab);
  var p = pillOf(it), sp = splitNote(noteText(it.note));
  opt = opt || {};
  // 시트에서 빈 칸을 "-"로 적은 값은 보여주지 않는다. 직책·국적은 용어집으로 옮긴다.
  var meta = (it.sub || "").split(", ").filter(cleanName).map(function (x) { return termHTML(x); }).join(" · ");
  // 계약 만료를 알면 메타 줄 끝에 "계약 ~2027" 처럼 붙인다(연도면 연도, 날짜면 ISO 날짜). 없으면 메타 줄은 그대로다.
  if (contractOK(it.contract)) {
    var ctx = t("row.contract", { x: typeof it.contract === "number" ? isoOf(it.contract) : it.contract });
    meta = meta ? meta + " · " + esc(ctx) : esc(ctx);
  }
  // 지역 묶음이 아닌 최근 소식 보기에서는 메타 줄 앞에 지역 짧은 이름을 붙인다.
  if (opt.region) meta = esc(regionShort(it.region) || it.region) + (meta ? " · " + meta : "");
  // 상태 글(알약 아래 작은 글): 이동이 아니고 판정 앞머리가 아닌 행만. 판정은 원문으로 하고, 화면 글자는 용어집 또는 원문 + KR 로 보인다.
  var status = !it.moved && !/^(팀 이탈|계약 완료|방출|이탈 보도)/.test(it.status) ? termHTML(it.status) : "";
  // 이동 칸: 이동이면 경로(팀별 보기는 도착만). 이동이 없으면 팀 이름, 팀별 보기에서는 "—".
  var r = routeOf(it, tab.teamObj), move;
  if (r) move = routeHTML(r, { noFrom: !!opt.noTeam });
  else if (opt.noTeam) move = '<span class="none">—</span>';
  else move = link("team", it.tid ? teamUrl(it.tid) : "", textHTML(trWhole(it.team)));
  // 요약(caption)이 있으면 설명글로 쓴다. 출처 줄과 보도 시각은 메모 기준 그대로다. 없으면 메모 본문.
  var cap = cleanName(it.caption), body = cap ? noteText(cap) : sp.body;
  var detail = (body ? '<p class="detail">' + textHTML(body) + "</p>" : "") + (opt.more || "") + srcsHTML(sp, it.src);
  var f = foldHTML(detail);
  return '<li class="row s-' + (p[2] === "reported" ? "reported" : p[0]) + '"><div class="main">' + link("name", it.pid ? personUrl(it.pid) : "", nameHTML(it.name)) +
    (meta ? '<span class="meta">' + meta + "</span>" : "") + "</div>" +
    '<div class="move">' + move + "</div>" +
    '<div class="state">' + pill(p) + badge(it) + (status ? '<span class="lead">' + status + "</span>" : "") + "</div>" +
    '<div class="when"><span class="date' + (isNew(it) ? " new" : "") + '">' + relDate(it.date) + (stampLabel(it) && !sp.src ? " " + stampLabel(it) : "") + t("pill.reportedMark") + "</span></div>" +
    f.btn + f.fold + "</li>";
}
