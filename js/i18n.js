// 화면 문구 사전과 언어 상태. 브라우저와 Node(빌드·시험) 양쪽에서 불러온다. 최상위에서 window·document 를 쓰지 않는다.
import { KO } from "./i18n/ko.js";
import { EN } from "./i18n/en.js";

var DICT = { ko: KO, en: EN };

// 언어는 주소로만 정한다. 사이트 루트 아래 en/ 으로 시작하면 en, 아니면 ko. Node 에서는 ko(setLang 으로 바꿀 수 있다).
var ROOT = new URL("../", import.meta.url).pathname;
export function langOfPath(p) { return p.indexOf(ROOT + "en/") === 0 ? "en" : "ko"; }
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
