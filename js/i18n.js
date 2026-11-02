// 화면 문구 사전과 언어 상태. 브라우저와 Node(빌드·시험) 양쪽에서 불러온다. 최상위에서 window·document 를 쓰지 않는다.
import { KO } from "./i18n/ko.js";
import { EN } from "./i18n/en.js";
import { noteParts } from "./note.js";

var DICT = { ko: KO, en: EN };

// 언어는 주소로만 정한다. 사이트 루트 아래 en/ 으로 시작하면 en, 아니면 ko. Node 에서는 ko(setLang 으로 바꿀 수 있다).
var ROOT = new URL("../", import.meta.url).pathname;
function langOfPath(p) { return p.indexOf(ROOT + "en/") === 0 ? "en" : "ko"; }
export var LANG = typeof location !== "undefined" ? langOfPath(location.pathname) : "ko";

export function setLang(lang) { LANG = lang === "en" ? "en" : "ko"; }

// 문구 찾기. 현재 언어에 없으면 ko 값, ko 에도 없으면 키 자체를 돌려준다(시험에서 실패하게 한다).
// params 의 {name} 자리에 값을 그대로 끼운다. 이스케이프는 값을 넣는 쪽에서 한다.
export function tIn(lang, key, params) {
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var dict = DICT[lang] || KO, s = has(dict, key) ? dict[key] : has(KO, key) ? KO[key] : undefined;
  if (s === undefined) return key;
  if (params) s = s.replace(/\{(\w+)\}/g, function (m, k) { return has(params, k) ? String(params[k]) : m; });
  return s;
}
export function t(key, params) { return tIn(LANG, key, params); }

// 본문 번역 표(data/i18n-en.json): 원문 글자가 키, 영문이 값. 영문 화면에서만 main.js 가 채운다. 한국어 화면은 비어 있다.
var EN_TR = Object.create(null);
export function setEnTable(obj) { EN_TR = Object.assign(Object.create(null), obj || {}); }
var HANGUL_RE = /[가-힣]/, NUM_RE = /\d+(?:[.\/:~–-]\d+)*/g;

// 표의 번역을 쓰기 전 검사. 있어야 할 것: 원문과 같은 출처 시각, 같은 교차 확인 목록, 영문 몸말에 한글 없음, 원문의 숫자 묶음이 모두 영문에 있음.
// 하나라도 어긋나면 null(원문 + KR 로 보인다). 지어낸 내용이 화면에 나오는 것보다 낫다.
export function trEn(text) {
  var key = String(text == null ? "" : text);
  if (!Object.prototype.hasOwnProperty.call(EN_TR, key)) return null;
  var en = EN_TR[key], a = noteParts(key), b = noteParts(en);
  if (a.stamp !== b.stamp || JSON.stringify(a.cross) !== JSON.stringify(b.cross)) return null;
  if (HANGUL_RE.test(b.body)) return null;
  var nums = key.match(NUM_RE) || [];
  if (nums.some(function (n) { return en.indexOf(n) < 0; })) return null;
  return en;
}
// 글 하나(일정 제목, 출처 이름, 팀 칸, 상황 글): 영문이면 번역, 없으면 원문. 한국어 화면은 원문 그대로.
export function trWhole(text) { return LANG === "en" ? (trEn(text) || text) : text; }
// 비고(" / " 로 이어 쓴 조각들): 조각마다 번역하고 " / " 로 잇는다. 번역 없는 조각은 원문 그대로.
export function trNote(text) {
  if (LANG !== "en") return text;
  return String(text == null ? "" : text).split(" / ").map(function (seg) { return trEn(seg) || seg; }).join(" / ");
}

// 머리말 문장(<p class="lede"> 안쪽). time 은 "2026-11-02 01:21" 같은 글이다. 한국어는 시각 뒤에 "기준입니다", 영문은 "Updated … KST." 로 끝난다.
export function ledeHTML(lang, time) {
  return '<span class="intro">' + tIn(lang, "lede.intro") + '</span> <span class="more">' + tIn(lang, "lede.more") + "</span> " + tIn(lang, "lede.time", { time: time });
}
