// 지역·등급 이름(사전 글). 네 지역과 네 등급 밖의 값은 빈 글자다.
import { t } from "../i18n.js";

export var REGIONS = ["Americas", "EMEA", "Pacific", "China"];
// 지역·등급 이름은 쓰는 시점에 사전을 읽는다(setLang 뒤에도 맞게). 모르는 값은 "" 를 돌려준다.
export function regionName(r) { return REGIONS.indexOf(r) >= 0 ? t("region." + r) : ""; }
// 짧은 지역 이름(거르기 단추·목록 머리). 네 지역 밖의 값은 빈 글자다.
export function regionShort(r) { return REGIONS.indexOf(r) >= 0 ? t("region.short." + r) : ""; }
export var TIERS = ["partner", "ascended", "challengers", "academy"];
export function tierName(tier) { return TIERS.indexOf(tier) >= 0 ? t("team." + tier) : ""; }
